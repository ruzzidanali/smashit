-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Business" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "state" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "phone" TEXT,
    "openMinutes" INTEGER NOT NULL DEFAULT 540,
    "closeMinutes" INTEGER NOT NULL DEFAULT 1320,
    "slotMinutes" INTEGER NOT NULL DEFAULT 60,
    "priceCents" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Business" ("address", "city", "createdAt", "id", "name", "phone", "postcode", "slug", "state") SELECT "address", "city", "createdAt", "id", "name", "phone", "postcode", "slug", "state" FROM "Business";
DROP TABLE "Business";
ALTER TABLE "new_Business" RENAME TO "Business";
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
