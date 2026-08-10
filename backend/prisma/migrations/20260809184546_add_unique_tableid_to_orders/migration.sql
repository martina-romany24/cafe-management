/*
  Warnings:

  - A unique constraint covering the columns `[tableId]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "orders_tableId_key" ON "orders"("tableId");
