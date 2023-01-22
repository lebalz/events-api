-- CreateTable
CREATE TABLE "_UntisClassToUntisTeacher" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_UntisClassToUntisTeacher_AB_unique" ON "_UntisClassToUntisTeacher"("A", "B");

-- CreateIndex
CREATE INDEX "_UntisClassToUntisTeacher_B_index" ON "_UntisClassToUntisTeacher"("B");

-- AddForeignKey
ALTER TABLE "_UntisClassToUntisTeacher" ADD CONSTRAINT "_UntisClassToUntisTeacher_A_fkey" FOREIGN KEY ("A") REFERENCES "untis_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UntisClassToUntisTeacher" ADD CONSTRAINT "_UntisClassToUntisTeacher_B_fkey" FOREIGN KEY ("B") REFERENCES "untis_teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
