-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "EmailTac" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTac_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailTac_accountId_idx" ON "EmailTac"("accountId");

-- CreateIndex
CREATE INDEX "EmailTac_expiresAt_idx" ON "EmailTac"("expiresAt");

-- CreateIndex
CREATE INDEX "Account_phone_idx" ON "Account"("phone");

-- AddForeignKey
ALTER TABLE "EmailTac" ADD CONSTRAINT "EmailTac_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
