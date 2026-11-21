
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const batch = await prisma.batch.findFirst({
    where: { batchNumber: "HYD-2026-050" },
    include: {
      candidates: {
        include: {
          certificate: {
            select: {
              certificateNumber: true,
              status: true,
            },
          },
        },
      },
      certificates: {
        include: {
          delivery: true,
        },
      },
    },
  });

  if (!batch) {
    console.log("Batch HYD-2026-003 not found.");
    process.exitCode = 1;
    return;
  }

  const certificates = batch.certificates;
  const deliveries = certificates.map((cert) => cert.delivery);

  const uniqueNumbers = new Set(
    certificates.map((cert) => cert.certificateNumber)
  );

  const checks = {
    batchStatusIsIssued: batch.status === "ISSUED",
    candidateCountIsFifty: batch.candidates.length === 50,
    certificateCountMatchesCandidates:
      certificates.length === batch.candidates.length,
    certificateNumbersAreUnique:
      uniqueNumbers.size === certificates.length,
    allCertificatesActive:
      certificates.every((cert) => cert.status === "ACTIVE"),
    allDeliveriesSent:
      deliveries.every((delivery) => delivery?.status === "SENT"),
    allDeliveriesRetried:
      deliveries.every((delivery) => (delivery?.attempts ?? 0) >= 2),
  };

  console.log("\nBATCH:", batch.batchNumber);
  console.log("STATUS:", batch.status);
  console.log("CANDIDATES:", batch.candidates.length);

  console.log("\nCERTIFICATES:");
  console.table(
    certificates.map((cert) => ({
      certificateNumber: cert.certificateNumber,
      status: cert.status,
      deliveryStatus: cert.delivery?.status ?? "MISSING",
      attempts: cert.delivery?.attempts ?? 0,
      lastError: cert.delivery?.lastError ?? null,
    }))
  );

  console.log("\nVALIDATION CHECKS:");
  console.table(
    Object.entries(checks).map(([check, passed]) => ({
      check,
      result: passed ? "PASS" : "FAIL",
    }))
  );

  const allPassed = Object.values(checks).every(Boolean);

  console.log(
    allPassed
      ? "\nSUCCESS: All certificate issuance checks passed."
      : "\nWARNING: Some checks failed. Investigate before proceeding."
  );

  if (!allPassed) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
