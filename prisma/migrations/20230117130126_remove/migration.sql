/*
  Warnings:

  - You are about to drop the `__responsible_for` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "__responsible_for" DROP CONSTRAINT "__responsible_for_A_fkey";

-- DropForeignKey
ALTER TABLE "__responsible_for" DROP CONSTRAINT "__responsible_for_B_fkey";

-- DropTable
DROP TABLE "__responsible_for";

-- CreateTable
CREATE TABLE "_responsible_for" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_responsible_for_AB_unique" ON "_responsible_for"("A", "B");

-- CreateIndex
CREATE INDEX "_responsible_for_B_index" ON "_responsible_for"("B");

-- AddForeignKey
ALTER TABLE "_responsible_for" ADD CONSTRAINT "_responsible_for_A_fkey" FOREIGN KEY ("A") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_responsible_for" ADD CONSTRAINT "_responsible_for_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
