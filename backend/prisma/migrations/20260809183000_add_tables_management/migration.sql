-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('available', 'occupied', 'reserved');

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "paidQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "splitAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'open',
ADD COLUMN     "tableId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "tables" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "TableStatus" NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_transfer_logs" (
    "id" TEXT NOT NULL,
    "fromTableId" TEXT NOT NULL,
    "toTableId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "transferredBy" TEXT NOT NULL,
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "table_transfer_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tables_branchId_number_key" ON "tables"("branchId", "number");

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_transfer_logs" ADD CONSTRAINT "table_transfer_logs_fromTableId_fkey" FOREIGN KEY ("fromTableId") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_transfer_logs" ADD CONSTRAINT "table_transfer_logs_toTableId_fkey" FOREIGN KEY ("toTableId") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
