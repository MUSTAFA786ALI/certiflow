import { Router } from "express";
import { randomBytes } from "crypto";
import { prisma } from "../../config/prisma";
import { authenticate, allowRoles } from "../../middleware/auth.middleware";
import { UserRole, Prisma } from "@prisma/client";
import { enqueueCertificateDelivery } from "../deliveries/delivery.queue";

const router = Router();

router.post(
  "/:batchId/approve",
  authenticate,
  allowRoles(UserRole.STATE_OFFICER),
  async (req, res) => {
    try {
      const batchId = req.params.batchId;

      if (typeof batchId !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID",
        });
      }

      const result = await prisma.$transaction(
        async (tx) => {
          const batch = await tx.batch.findUnique({
            where: { id: batchId },
            include: { candidates: true },
          });

          if (!batch) return { error: "NOT_FOUND" as const };

          if (batch.status !== "STATE_REVIEW") {
            return { error: "INVALID_STATUS" as const };
          }

          if (batch.candidates.length === 0) {
            return { error: "NO_CANDIDATES" as const };
          }

          const transition = await tx.batch.updateMany({
            where: {
              id: batch.id,
              status: "STATE_REVIEW",
            },
            data: {
              status: "ISSUED",
              pendingSince: null,
            },
          });

          if (transition.count !== 1) {
            return { error: "ALREADY_PROCESSED" as const };
          }

          // Prepare all certificates in memory.
          const certificateData = batch.candidates.map(
            (candidate, index) => ({
              batchId: batch.id,
              candidateId: candidate.id,
              certificateNumber: `CF-${batch.batchNumber}-${String(
                index + 1
              ).padStart(3, "0")}`,
              verificationToken: randomBytes(32).toString("hex"),
            })
          );

          // Insert certificates in one database operation.
          await tx.certificate.createMany({
            data: certificateData,
          });

          // Fetch the newly created certificate IDs.
          const issuedCertificates = await tx.certificate.findMany({
            where: { batchId: batch.id },
            select: {
              id: true,
              certificateNumber: true,
              verificationToken: true,
            },
          });

          // Create all delivery records in one operation.
          await tx.delivery.createMany({
            data: issuedCertificates.map((certificate) => ({
              certificateId: certificate.id,
              status: "PENDING",
            })),
          });

          await tx.auditLog.create({
            data: {
              actorId: req.user!.userId,
              action: "STATE_APPROVED_AND_CERTIFICATES_ISSUED",
              entityType: "Batch",
              entityId: batch.id,
              details: {
                batchNumber: batch.batchNumber,
                certificateCount: issuedCertificates.length,
              },
            },
          });

          return {
            batchNumber: batch.batchNumber,
            certificateCount: issuedCertificates.length,
            certificates: issuedCertificates,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 10000,
          timeout: 60000,
        }
      );

      if ("error" in result) {
        const responses = {
          NOT_FOUND: [404, "Batch not found"],
          INVALID_STATUS: [409, "Batch is not awaiting state approval"],
          NO_CANDIDATES: [400, "Cannot issue certificates for an empty batch"],
          ALREADY_PROCESSED: [409, "Batch has already been processed"],
        } as const;

        const [status, message] = responses[result.error];

        return res.status(status).json({
          success: false,
          message,
        });
      }

      // Queue notifications only after the transaction commits.
      let queuedDeliveries = 0;

      try {
        await Promise.all(
          result.certificates.map(async (certificate) => {
            await enqueueCertificateDelivery(certificate.id);
            queuedDeliveries++;
          })
        );
      } catch (queueError) {
        console.error("Some delivery jobs could not be queued:", queueError);
      }

      return res.status(200).json({
        success: true,
        message: "Batch approved and certificates issued successfully",
        ...result,
        queuedDeliveries,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Duplicate certificate detected. Transaction rolled back.",
        });
      }

      if (error.code === "P2034") {
        return res.status(409).json({
          success: false,
          message: "Concurrent approval conflict. Please retry.",
        });
      }

      console.error("Certificate issuance error:", error);

      return res.status(500).json({
        success: false,
        message: "Certificate issuance failed",
      });
    }
  }
);

router.patch(
  "/:certificateId/cancel",
  authenticate,
  allowRoles(UserRole.STATE_OFFICER),
  async (req, res) => {
    try {
      const certificateId = req.params.certificateId;

      if (typeof certificateId !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid certificate ID",
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const certificate = await tx.certificate.findUnique({
          where: { id: certificateId },
        });

        if (!certificate) {
          return { error: "NOT_FOUND" as const };
        }

        if (certificate.status === "CANCELLED") {
          return { error: "ALREADY_CANCELLED" as const };
        }

        const updated = await tx.certificate.updateMany({
          where: {
            id: certificateId,
            status: "ACTIVE",
          },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        });

        if (updated.count !== 1) {
          return { error: "ALREADY_CANCELLED" as const };
        }

        await tx.auditLog.create({
          data: {
            actorId: req.user!.userId,
            action: "CERTIFICATE_CANCELLED",
            entityType: "Certificate",
            entityId: certificateId,
            details: {
              certificateNumber: certificate.certificateNumber,
            },
          },
        });

        return {
          certificateNumber: certificate.certificateNumber,
        };
      });

      if ("error" in result) {
        if (result.error === "NOT_FOUND") {
          return res.status(404).json({
            success: false,
            message: "Certificate not found",
          });
        }

        return res.status(409).json({
          success: false,
          message: "Certificate is already cancelled",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Certificate cancelled successfully",
        certificateNumber: result.certificateNumber,
      });
    } catch (error) {
      console.error("Certificate cancellation error:", error);

      return res.status(500).json({
        success: false,
        message: "Certificate cancellation failed",
      });
    }
  }
);

export default router;
