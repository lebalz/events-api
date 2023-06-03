-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "EventState" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'REFUSED');

-- CreateEnum
CREATE TYPE "JobState" AS ENUM ('PENDING', 'ERROR', 'DONE', 'REVERTED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('IMPORT', 'CLONE', 'SYNC_UNTIS');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "untis_id" INTEGER,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ics_locator" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "description_long" TEXT NOT NULL DEFAULT '',
    "state" "EventState" NOT NULL DEFAULT 'DRAFT',
    "import_id" UUID,
    "classes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "class_groups" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "teachers_only" BOOLEAN NOT NULL DEFAULT false,
    "klp_only" BOOLEAN NOT NULL DEFAULT false,
    "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "letter" TEXT NOT NULL DEFAULT '',
    "classLetters" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "color" TEXT NOT NULL DEFAULT '#306cce',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semesters" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "untisSyncDate" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "semesters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_periods" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "type" "JobType" NOT NULL,
    "state" "JobState" NOT NULL DEFAULT 'PENDING',
    "user_id" UUID NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "filename" TEXT,
    "log" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "untis_teachers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "long_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,

    CONSTRAINT "untis_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "untis_lessons" (
    "id" SERIAL NOT NULL,
    "room" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "semester_nr" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "week_day" INTEGER NOT NULL,
    "start_hhmm" INTEGER NOT NULL,
    "end_hhmm" INTEGER NOT NULL,
    "semester_id" UUID NOT NULL,

    CONSTRAINT "untis_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "untis_classes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "legacy_name" TEXT,
    "year" INTEGER NOT NULL,
    "sf" TEXT NOT NULL,
    "department_id" UUID,

    CONSTRAINT "untis_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_events_to_departments" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "_teachers_to_lessons" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_classes_to_lessons" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_teachers_to_classes" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_untis_id_key" ON "users"("untis_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "untis_teachers_name_key" ON "untis_teachers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "untis_classes_name_key" ON "untis_classes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "untis_classes_legacy_name_key" ON "untis_classes"("legacy_name");

-- CreateIndex
CREATE UNIQUE INDEX "_events_to_departments_AB_unique" ON "_events_to_departments"("A", "B");

-- CreateIndex
CREATE INDEX "_events_to_departments_B_index" ON "_events_to_departments"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_teachers_to_lessons_AB_unique" ON "_teachers_to_lessons"("A", "B");

-- CreateIndex
CREATE INDEX "_teachers_to_lessons_B_index" ON "_teachers_to_lessons"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_classes_to_lessons_AB_unique" ON "_classes_to_lessons"("A", "B");

-- CreateIndex
CREATE INDEX "_classes_to_lessons_B_index" ON "_classes_to_lessons"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_teachers_to_classes_AB_unique" ON "_teachers_to_classes"("A", "B");

-- CreateIndex
CREATE INDEX "_teachers_to_classes_B_index" ON "_teachers_to_classes"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_untis_id_fkey" FOREIGN KEY ("untis_id") REFERENCES "untis_teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "untis_lessons" ADD CONSTRAINT "untis_lessons_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "untis_classes" ADD CONSTRAINT "untis_classes_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_events_to_departments" ADD CONSTRAINT "_events_to_departments_A_fkey" FOREIGN KEY ("A") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_events_to_departments" ADD CONSTRAINT "_events_to_departments_B_fkey" FOREIGN KEY ("B") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_teachers_to_lessons" ADD CONSTRAINT "_teachers_to_lessons_A_fkey" FOREIGN KEY ("A") REFERENCES "untis_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_teachers_to_lessons" ADD CONSTRAINT "_teachers_to_lessons_B_fkey" FOREIGN KEY ("B") REFERENCES "untis_teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_classes_to_lessons" ADD CONSTRAINT "_classes_to_lessons_A_fkey" FOREIGN KEY ("A") REFERENCES "untis_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_classes_to_lessons" ADD CONSTRAINT "_classes_to_lessons_B_fkey" FOREIGN KEY ("B") REFERENCES "untis_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_teachers_to_classes" ADD CONSTRAINT "_teachers_to_classes_A_fkey" FOREIGN KEY ("A") REFERENCES "untis_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_teachers_to_classes" ADD CONSTRAINT "_teachers_to_classes_B_fkey" FOREIGN KEY ("B") REFERENCES "untis_teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
