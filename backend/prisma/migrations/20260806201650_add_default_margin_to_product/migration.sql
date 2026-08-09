-- AlterTable
ALTER TABLE "products" ADD COLUMN     "defaultMargin" DECIMAL(5,4) NOT NULL DEFAULT 0.2,
ADD COLUMN     "marginType" "MarginType" NOT NULL DEFAULT 'percentage';
