/*
  Warnings:

  - You are about to drop the column `details` on the `Result` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Result" DROP COLUMN "details",
ADD COLUMN     "reacTime" DOUBLE PRECISION;
