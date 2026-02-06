-- CreateTable
CREATE TABLE "PendingAccount" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "tacHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingAccount_email_idx" ON "PendingAccount"("email");

-- CreateIndex
CREATE INDEX "PendingAccount_expiresAt_idx" ON "PendingAccount"("expiresAt");
