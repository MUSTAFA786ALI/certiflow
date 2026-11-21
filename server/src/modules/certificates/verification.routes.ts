
import { Router } from "express";
import { prisma } from "../../config/prisma";

const router = Router();

// Public endpoint: no authentication required
router.get("/:token", async (req, res) => {
  try {
    const token = req.params.token;

    if (typeof token !== "string" || !token) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification token",
      });
    }

    const certificate = await prisma.certificate.findUnique({
      where: {
        verificationToken: token,
      },
      include: {
        candidate: {
          select: {
            fullName: true,
            courseName: true,
          },
        },
        batch: {
          select: {
            batchNumber: true,
          },
        },
      },
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        valid: false,
        status: "NOT_FOUND",
        message: "Certificate not found",
      });
    }

    if (certificate.status === "CANCELLED") {
      return res.status(200).json({
        success: true,
        valid: false,
        status: "CANCELLED",
        message: "This certificate has been cancelled",
        certificateNumber: certificate.certificateNumber,
        candidateName: certificate.candidate.fullName,
        courseName: certificate.candidate.courseName,
        cancelledAt: certificate.cancelledAt,
      });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      status: "ACTIVE",
      message: "Certificate is genuine and active",
      certificateNumber: certificate.certificateNumber,
      candidateName: certificate.candidate.fullName,
      courseName: certificate.candidate.courseName,
      batchNumber: certificate.batch.batchNumber,
      issuedAt: certificate.issuedAt,
    });
  } catch (error) {
    console.error("Certificate verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Certificate verification failed",
    });
  }
});

export default router;
