import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fake findings so the dashboard has data on first boot.
const demoIssues = [
  {
    id: "demo:1",
    file: ".env",
    line: 3,
    type: "Committed .env File",
    severity: "HIGH" as const,
    matchMasked: "•de•env",
    explanation:
      "A .env file appears to be committed to the repository. Environment files routinely hold database passwords and API keys.",
    remediation:
      "Add .env to .gitignore, commit a sanitized .env.example instead, and rotate every value that was ever committed.",
    source: "regex" as const,
  },
  {
    id: "demo:2",
    file: ".env",
    line: 5,
    type: "AWS Access Key ID",
    severity: "CRITICAL" as const,
    matchMasked: "AKIA••••••AMPLE",
    explanation:
      "An AWS access key ID was committed. Paired with a secret key it grants full programmatic access to your AWS account.",
    remediation:
      "Deactivate the key in AWS IAM immediately, rotate it, and load credentials from environment variables instead.",
    source: "groq" as const,
  },
  {
    id: "demo:3",
    file: "src/config.ts",
    line: 12,
    type: "JWT",
    severity: "MEDIUM" as const,
    matchMasked: "eyJh••••••Y2w",
    explanation: "A JSON Web Token was committed and may still be valid until expiry.",
    remediation: "Invalidate the token/session and rotate the signing secret.",
    source: "regex" as const,
  },
];

async function main() {
  console.log("Seeding GitShield demo data…");

  await prisma.scanResult.deleteMany();
  await prisma.repository.deleteMany();

  const vulnerable = await prisma.repository.create({
    data: {
      name: "acme/legacy-api",
      url: "https://github.com/acme/legacy-api",
      lastScannedAt: new Date(),
    },
  });

  await prisma.scanResult.create({
    data: {
      repositoryId: vulnerable.id,
      status: "VULNERABLE",
      sourceType: "REPOSITORY",
      filesScanned: 12,
      riskScore: 68,
      aiSummary:
        "Hardcoded AWS credentials and a committed .env file were detected. Rotate all affected keys and purge them from git history immediately.",
      issuesFound: demoIssues,
    },
  });

  const safe = await prisma.repository.create({
    data: {
      name: "acme/landing-page",
      url: "https://github.com/acme/landing-page",
      lastScannedAt: new Date(),
    },
  });

  await prisma.scanResult.create({
    data: {
      repositoryId: safe.id,
      status: "SAFE",
      sourceType: "REPOSITORY",
      filesScanned: 7,
      riskScore: 0,
      aiSummary: "No hardcoded secrets were found in the scanned files.",
      issuesFound: [],
    },
  });

  console.log("Seed complete: 2 repositories, 2 scans.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
