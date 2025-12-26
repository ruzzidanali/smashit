-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "paymentProof" TEXT;
ALTER TABLE "Booking" ADD COLUMN "paymentStatus" TEXT DEFAULT 'PENDING';
