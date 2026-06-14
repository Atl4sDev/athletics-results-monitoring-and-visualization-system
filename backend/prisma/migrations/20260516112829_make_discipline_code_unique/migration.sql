/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Discipline` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Discipline_code_key" ON "Discipline"("code");
