/*
  Warnings:

  - A unique constraint covering the columns `[ics_locator]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "users_ics_locator_key" ON "users"("ics_locator");
