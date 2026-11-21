
import { Worker, Job } from "bullmq";
import { redis } from "../../config/redis";
import { prisma } from "../../config/prisma";

type DeliveryJob = {
  certificateId: string;
};

// Mock WhatsApp provider.
// Set MOCK_WHATSAPP_FAIL_FIRST_ATTEMPT=true to demonstrate retries.
async function sendMockWhatsApp(
  phone: string,
  certificateNumber: string,
  attempt: number
) {
  console.log(
    `Mock WhatsApp: sending ${certificateNumber} to ${phone}`
  );

  if (
    process.env.MOCK_WHATSAPP_FAIL_FIRST_ATTEMPT === "true" &&
    attempt === 1
  ) {
    throw new Error("Simulated WhatsApp provider failure");
  }

  return { success: true };
}

const worker = new Worker<DeliveryJob>(
  "certificate-deliveries",
  async (job: Job<DeliveryJob>) => {
    const { certificateId } = job.data;

    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        candidate: true,
        delivery: true,
      },
    });

    if (!certificate || !certificate.delivery) {
      throw new Error("Certificate or delivery record not found");
    }

    if (certificate.delivery.status === "SENT") {
    return { success: true, skipped: true };
    }

    if (certificate.status === "CANCELLED") {
    await prisma.delivery.update({
        where: { certificateId },
        data: {
        status: "FAILED",
        lastError: "Certificate was cancelled before delivery",
        },
    });

    return {
        success: true,
        skipped: true,
        reason: "Certificate cancelled",
    };
    }

    const attempt = job.attemptsMade + 1;

    try {
      await sendMockWhatsApp(
        certificate.candidate.phone,
        certificate.certificateNumber,
        attempt
      );

      await prisma.delivery.update({
        where: { certificateId },
        data: {
          status: "SENT",
          attempts: attempt,
          sentAt: new Date(),
          lastError: null,
        },
      });

      console.log(
        `Delivery successful: ${certificate.certificateNumber}`
      );

      return { success: true };
    } catch (error) {
      await prisma.delivery.update({
        where: { certificateId },
        data: {
          status: "PENDING",
          attempts: attempt,
          lastError:
            error instanceof Error ? error.message : "Unknown error",
        },
      });

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`Delivery job completed: ${job.id}`);
});

worker.on("failed", async (job, error) => {
  if (!job) return;

  console.error(`Delivery attempt failed: ${job.id}`, error.message);

  // Only mark FAILED after all configured attempts are exhausted.
  if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await prisma.delivery.updateMany({
      where: {
        certificateId: job.data.certificateId,
        status: "PENDING",
      },
      data: {
        status: "FAILED",
        lastError: error.message,
      },
    });
  }
});

export default worker;
