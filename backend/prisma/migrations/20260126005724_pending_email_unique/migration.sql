/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `PendingAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PendingAccount_email_idx";

-- CreateIndex
CREATE UNIQUE INDEX "PendingAccount_email_key" ON "PendingAccount"("email");
