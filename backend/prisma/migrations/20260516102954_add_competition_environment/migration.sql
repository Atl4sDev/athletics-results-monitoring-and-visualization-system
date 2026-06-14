-- CreateEnum
CREATE TYPE "CompetitionEnvironment" AS ENUM ('INDOOR', 'OUTDOOR');

-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "environment" "CompetitionEnvironment" NOT NULL DEFAULT 'OUTDOOR';
