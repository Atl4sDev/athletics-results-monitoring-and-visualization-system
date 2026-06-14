-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DisciplineType" AS ENUM ('TRACK', 'FIELD');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'MIXED');

-- CreateEnum
CREATE TYPE "AgeCategory" AS ENUM ('U14', 'U16', 'U18', 'U20', 'U23', 'SENIOR', 'MASTERS');

-- CreateEnum
CREATE TYPE "HeatStatus" AS ENUM ('SCHEDULED', 'UNCONFIRMED', 'OFFICIAL');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('PENDING', 'OK', 'DNS', 'DNF', 'DQ', 'FS');

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateStart" TIMESTAMP(3) NOT NULL,
    "dateEnd" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "status" "CompetitionStatus" NOT NULL,
    "documents" JSONB,
    "syncToken" TEXT NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discipline" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DisciplineType" NOT NULL,
    "isStandard" BOOLEAN NOT NULL,

    CONSTRAINT "Discipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "disciplineId" INTEGER,
    "customName" TEXT,
    "scheduledTime" TIMESTAMP(3),
    "roundName" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "lynxEventId" INTEGER NOT NULL,
    "lynxRoundId" INTEGER NOT NULL,
    "ageCategory" "AgeCategory" NOT NULL,
    "eventType" "DisciplineType" NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Heat" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "HeatStatus" NOT NULL,
    "heatNumber" INTEGER NOT NULL,
    "lynxHeatId" INTEGER NOT NULL,
    "wind" DOUBLE PRECISION,

    CONSTRAINT "Heat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Athlete" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "birthDate" TIMESTAMP(3),
    "licenseNumber" TEXT NOT NULL,

    CONSTRAINT "Athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "heatId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "lane" INTEGER NOT NULL,
    "bibNumber" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "status" "ResultStatus" NOT NULL DEFAULT 'PENDING',
    "place" INTEGER,
    "mark" TEXT,
    "sortValue" DOUBLE PRECISION,
    "details" JSONB,
    "isPB" BOOLEAN NOT NULL DEFAULT false,
    "isSB" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Competition_syncToken_key" ON "Competition"("syncToken");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_licenseNumber_key" ON "Athlete"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Heat" ADD CONSTRAINT "Heat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_heatId_fkey" FOREIGN KEY ("heatId") REFERENCES "Heat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
