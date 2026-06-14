/*
  Warnings:

  - A unique constraint covering the columns `[competitionId,lynxEventId,lynxRoundId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[eventId,lynxHeatId]` on the table `Heat` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[heatId,athleteId]` on the table `Result` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Event_competitionId_lynxEventId_lynxRoundId_key" ON "Event"("competitionId", "lynxEventId", "lynxRoundId");

-- CreateIndex
CREATE UNIQUE INDEX "Heat_eventId_lynxHeatId_key" ON "Heat"("eventId", "lynxHeatId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_heatId_athleteId_key" ON "Result"("heatId", "athleteId");
