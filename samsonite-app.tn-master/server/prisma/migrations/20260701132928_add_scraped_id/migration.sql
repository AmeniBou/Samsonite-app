/*
  Warnings:

  - A unique constraint covering the columns `[scrapedId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `scrapedId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "scrapedId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Product_scrapedId_key" ON "Product"("scrapedId");
