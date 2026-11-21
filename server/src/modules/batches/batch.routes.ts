
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, allowRoles } from "../../middleware/auth.middleware";
import { UserRole } from "@prisma/client";

const router = Router();

const candidateSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/),
  email: z.string().email().optional().or(z.literal("")),
  courseName: z.string().trim().min(2),
});

const createBatchSchema = z.object({
  batchNumber: z.string().trim().min(3),
  district: z.string().trim().min(2),
  candidates: z.array(candidateSchema).min(1).max(500),
});

// Fetch batches visible to the authenticated user.
router.get(
  "/",
  authenticate,
  async (req, res) => {
    try {
      const role = req.user!.role;
      const userId = req.user!.userId;

      const where =
        role === UserRole.TRAINING_CENTRE
          ? { centreId: userId }
          : role === UserRole.DISTRICT_OFFICER
          ? { district: req.user!.district ?? undefined }
          : {};

      const batches = await prisma.batch.findMany({
        where,
        include: {
          candidates: {
            select: { id: true },
          },
          approvals: {
            include: {
              officer: {
                select: { name: true, role: true },
              },
            },
          },
          centre: {
            select: { name: true, centreName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        success: true,
        batches: batches.map((batch) => ({
          ...batch,
          candidateCount: batch.candidates.length,
          candidates: undefined,
        })),
      });
    } catch (error) {
      console.error("Fetch batches error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch batches",
      });
    }
  }
);

router.post(
  "/",
  authenticate,
  allowRoles(UserRole.TRAINING_CENTRE),
  async (req, res) => {
    const parsed = createBatchSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Batch validation failed. No candidates were saved.",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    try {
      const { batchNumber, district, candidates } = parsed.data;

      const batch = await prisma.batch.create({
        data: {
          batchNumber,
          district,
          centreId: req.user!.userId,
          needsQualityReview: candidates.length >= 50,
          candidates: {
            create: candidates.map((candidate) => ({
              ...candidate,
              email: candidate.email || null,
            })),
          },
        },
        include: {
          candidates: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Batch created successfully",
        batch,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Batch number already exists",
        });
      }

      console.error("Batch creation error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to create batch",
      });
    }
  }
);

// Training centre submits a draft batch for review.
router.post(
  "/:id/submit",
  authenticate,
  allowRoles(UserRole.TRAINING_CENTRE),
  async (req, res) => {
    try {
      const batch = await prisma.batch.findFirst({
        where: {
          id: req.params.id,
          centreId: req.user!.userId,
        },
      });

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      if (!["DRAFT", "RETURNED"].includes(batch.status)) {
        return res.status(409).json({
          success: false,
          message: "This batch cannot be submitted in its current state",
        });
      }

      const updated = await prisma.batch.update({
        where: { id: batch.id },
        data: {
          status: "DISTRICT_REVIEW",
          submittedAt: new Date(),
          pendingSince: new Date(),
          ...(batch.status === "RETURNED"
            ? { reviewCycle: { increment: 1 } }
            : {}),
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: req.user!.userId,
          action: "BATCH_SUBMITTED",
          entityType: "Batch",
          entityId: batch.id,
          details: { reviewCycle: updated.reviewCycle },
        },
      });

      return res.json({
        success: true,
        message: "Batch submitted for district review",
        batch: updated,
      });
    } catch (error) {
      console.error("Batch submission error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to submit batch",
      });
    }
  }
);

export default router;
