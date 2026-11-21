
import { Queue } from "bullmq";
import { redis } from "../../config/redis";

export const deliveryQueue = new Queue("certificate-deliveries", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export async function enqueueCertificateDelivery(
  certificateId: string
) {
  return deliveryQueue.add(
    "send-whatsapp",
    { certificateId },
    {
      jobId: `certificate-${certificateId}`,
    }
  );
}
