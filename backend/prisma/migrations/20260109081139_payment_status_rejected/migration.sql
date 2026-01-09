-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "businessId" INTEGER NOT NULL,
    "courtId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentProof" TEXT,
    CONSTRAINT "Booking_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("businessId", "courtId", "createdAt", "customerName", "date", "endMinutes", "id", "paymentProof", "paymentStatus", "phone", "startMinutes", "status") SELECT "businessId", "courtId", "createdAt", "customerName", "date", "endMinutes", "id", "paymentProof", coalesce("paymentStatus", 'PENDING') AS "paymentStatus", "phone", "startMinutes", "status" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE INDEX "Booking_businessId_date_idx" ON "Booking"("businessId", "date");
CREATE INDEX "Booking_businessId_courtId_date_idx" ON "Booking"("businessId", "courtId", "date");
CREATE INDEX "Booking_phone_idx" ON "Booking"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
