-- CreateTable
CREATE TABLE "untis_teachers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "fore_name" TEXT NOT NULL,
    "long_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,
    "dids" INTEGER[],

    CONSTRAINT "untis_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UntisSubject" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "long_name" TEXT NOT NULL,
    "back_color" TEXT NOT NULL,

    CONSTRAINT "UntisSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UntisRoom" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "long_name" TEXT NOT NULL,

    CONSTRAINT "UntisRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "untis_lessons" (
    "id" SERIAL NOT NULL,
    "room" TEXT NOT NULL,
    "subject_id" INTEGER NOT NULL,

    CONSTRAINT "untis_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "untis_classes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sf" TEXT NOT NULL,

    CONSTRAINT "untis_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UntisLessonToUntisRoom" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_UntisClassToUntisLesson" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "untis_teachers_name_key" ON "untis_teachers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_UntisLessonToUntisRoom_AB_unique" ON "_UntisLessonToUntisRoom"("A", "B");

-- CreateIndex
CREATE INDEX "_UntisLessonToUntisRoom_B_index" ON "_UntisLessonToUntisRoom"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_UntisClassToUntisLesson_AB_unique" ON "_UntisClassToUntisLesson"("A", "B");

-- CreateIndex
CREATE INDEX "_UntisClassToUntisLesson_B_index" ON "_UntisClassToUntisLesson"("B");

-- AddForeignKey
ALTER TABLE "untis_lessons" ADD CONSTRAINT "untis_lessons_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "UntisSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UntisLessonToUntisRoom" ADD CONSTRAINT "_UntisLessonToUntisRoom_A_fkey" FOREIGN KEY ("A") REFERENCES "untis_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UntisLessonToUntisRoom" ADD CONSTRAINT "_UntisLessonToUntisRoom_B_fkey" FOREIGN KEY ("B") REFERENCES "UntisRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UntisClassToUntisLesson" ADD CONSTRAINT "_UntisClassToUntisLesson_A_fkey" FOREIGN KEY ("A") REFERENCES "untis_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UntisClassToUntisLesson" ADD CONSTRAINT "_UntisClassToUntisLesson_B_fkey" FOREIGN KEY ("B") REFERENCES "untis_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
