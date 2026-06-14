-- AlterTable
ALTER TABLE "Admin" ALTER COLUMN "role" SET DEFAULT 'admin';

-- AlterTable
ALTER TABLE "Heat" ADD COLUMN     "confirmedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Competition_status_dateStart_idx" ON "Competition"("status", "dateStart");

-- CreateIndex
CREATE INDEX "Competition_environment_idx" ON "Competition"("environment");

-- CreateIndex
CREATE INDEX "Event_disciplineId_gender_ageCategory_idx" ON "Event"("disciplineId", "gender", "ageCategory");

-- CreateIndex
CREATE INDEX "Result_athleteId_sortValue_idx" ON "Result"("athleteId", "sortValue");

-- CreateIndex
CREATE INDEX "Result_status_sortValue_idx" ON "Result"("status", "sortValue");

-- CreateIndex
CREATE INDEX "Result_isPB_idx" ON "Result"("isPB");

-- CreateIndex
CREATE INDEX "Result_isSB_idx" ON "Result"("isSB");
