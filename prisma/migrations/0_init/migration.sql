-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('SAFE', 'VULNERABLE');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('REPOSITORY', 'PASTE');

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "lastScannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanResult" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "status" "ScanStatus" NOT NULL,
    "sourceType" "SourceType" NOT NULL DEFAULT 'REPOSITORY',
    "issuesFound" JSONB NOT NULL DEFAULT '[]',
    "filesScanned" INTEGER NOT NULL DEFAULT 0,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Repository_url_key" ON "Repository"("url");

-- CreateIndex
CREATE INDEX "Repository_createdAt_idx" ON "Repository"("createdAt");

-- CreateIndex
CREATE INDEX "ScanResult_repositoryId_idx" ON "ScanResult"("repositoryId");

-- CreateIndex
CREATE INDEX "ScanResult_createdAt_idx" ON "ScanResult"("createdAt");

-- CreateIndex
CREATE INDEX "ScanResult_status_idx" ON "ScanResult"("status");

-- AddForeignKey
ALTER TABLE "ScanResult" ADD CONSTRAINT "ScanResult_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

