import { Router } from "express";
import { prisma } from "../../config/prisma";
import { authenticate, allowRoles } from "../../middleware/auth.middleware";
import { UserRole, ApprovalDecision, Prisma } from "@prisma/client";

const router = Router();

router.post(
  "/:batchId/approve",
  authenticate,
  allowRoles(UserRole.DISTRICT_OFFICER),
  
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
          });

          if (!batch) {
            return { error: "NOT_FOUND" as const };
          }

          if (batch.status !== "DISTRICT_REVIEW") {
            return { error: "INVALID_STATUS" as const };
          }

          if (batch.district !== req.user!.district) {
            return { error: "FORBIDDEN" as const };
          }

          await tx.approval.create({
            data: {
              batchId: batch.id,
              officerId: req.user!.userId,
              reviewCycle: batch.reviewCycle,
              decision: ApprovalDecision.APPROVED,
            },
          });

          const approvalCount = await tx.approval.count({
            where: {
              batchId: batch.id,
              reviewCycle: batch.reviewCycle,
              decision: ApprovalDecision.APPROVED,
            },
          });

          const nextStatus =
            approvalCount >= 2
              ? batch.needsQualityReview
                ? "QUALITY_REVIEW"
                : "STATE_REVIEW"
              : "DISTRICT_REVIEW";

          const updatedBatch = await tx.batch.update({
            where: { id: batch.id },
            data: {
              status: nextStatus,
              pendingSince:
                approvalCount >= 2 ? new Date() : batch.pendingSince,
            },
          });

          await tx.auditLog.create({
            data: {
              actorId: req.user!.userId,
              action: "DISTRICT_APPROVED",
              entityType: "Batch",
              entityId: batch.id,
              details: {
                reviewCycle: batch.reviewCycle,
                approvalCount,
                nextStatus,
              },
            },
          });

          return {
            batch: updatedBatch,
            approvalCount,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );

      if ("error" in result) {
        const responses = {
          NOT_FOUND: [404, "Batch not found"],
          INVALID_STATUS: [409, "Batch is not awaiting district approval"],
          FORBIDDEN: [403, "You cannot review batches outside your district"],
        } as const;

        if ("error" in result && result.error) {
        const [status, message] = responses[result.error];
        return res.status(status).json({
            success: false,
            message,
        });
        }
      }

      return res.json({
        success: true,
        message:
          result.approvalCount >= 2
            ? "Two district approvals received. Batch advanced."
            : "First district approval recorded. Waiting for another officer.",
        approvalCount: result.approvalCount,
        requiredApprovals: 2,
        batch: result.batch,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "You have already approved this batch in this review cycle",
        });
      }

      if (error.code === "P2034") {
        return res.status(409).json({
          success: false,
          message: "Concurrent review conflict. Please retry.",
        });
      }

      console.error("Approval error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to process approval",
      });
    }
  }
);


router.post(
  "/:batchId/quality-approve",
  authenticate,
  allowRoles(UserRole.QUALITY_OFFICER),
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
          });

          if (!batch) {
            return { error: "NOT_FOUND" as const };
          }

          if (batch.status !== "QUALITY_REVIEW" || !batch.needsQualityReview) {
            return { error: "INVALID_STATUS" as const };
          }

          if (batch.district !== req.user!.district) {
            return { error: "FORBIDDEN" as const };
          }

          await tx.approval.create({
            data: {
              batchId: batch.id,
              officerId: req.user!.userId,
              reviewCycle: batch.reviewCycle,
              decision: ApprovalDecision.APPROVED,
            },
          });

          const updatedBatch = await tx.batch.update({
            where: { id: batch.id },
            data: {
              status: "STATE_REVIEW",
              pendingSince: new Date(),
            },
          });

          await tx.auditLog.create({
            data: {
              actorId: req.user!.userId,
              action: "QUALITY_APPROVED",
              entityType: "Batch",
              entityId: batch.id,
              details: {
                reviewCycle: batch.reviewCycle,
                nextStatus: "STATE_REVIEW",
              },
            },
          });

          return { batch: updatedBatch };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );

      if ("error" in result) {
        const responses = {
          NOT_FOUND: [404, "Batch not found"],
          INVALID_STATUS: [409, "Batch is not awaiting quality review"],
          FORBIDDEN: [403, "You cannot review batches outside your district"],
        } as const;

        const [status, message] = responses[result.error];

        return res.status(status).json({
          success: false,
          message,
        });
      }

      return res.json({
        success: true,
        message: "Quality approval recorded. Batch advanced to state review.",
        batch: result.batch,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "You have already approved this batch in this review cycle",
        });
      }

      if (error.code === "P2034") {
        return res.status(409).json({
          success: false,
          message: "Concurrent review conflict. Please retry.",
        });
      }

      console.error("Quality approval error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to process quality approval",
      });
    }
  }
);


export default router;
