-- CreateTable
CREATE TABLE "_registration_periods_to_departments" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_registration_periods_to_departments_AB_unique" ON "_registration_periods_to_departments"("A", "B");

-- CreateIndex
CREATE INDEX "_registration_periods_to_departments_B_index" ON "_registration_periods_to_departments"("B");

-- AddForeignKey
ALTER TABLE "_registration_periods_to_departments" ADD CONSTRAINT "_registration_periods_to_departments_A_fkey" FOREIGN KEY ("A") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_registration_periods_to_departments" ADD CONSTRAINT "_registration_periods_to_departments_B_fkey" FOREIGN KEY ("B") REFERENCES "registration_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
