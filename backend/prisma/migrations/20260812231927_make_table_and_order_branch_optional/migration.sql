-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_branchId_fkey";

-- DropForeignKey
ALTER TABLE "tables" DROP CONSTRAINT "tables_branchId_fkey";

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "branchId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tables" ALTER COLUMN "branchId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
