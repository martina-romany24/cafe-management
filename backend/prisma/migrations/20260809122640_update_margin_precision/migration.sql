-- AlterTable
ALTER TABLE "branch_product_pricing" ALTER COLUMN "marginValue" SET DATA TYPE DECIMAL(12,4);

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "defaultMargin" SET DEFAULT 20,
ALTER COLUMN "defaultMargin" SET DATA TYPE DECIMAL(12,4);
