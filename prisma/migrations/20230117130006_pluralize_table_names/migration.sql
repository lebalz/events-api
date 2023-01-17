/*
  Warnings:

  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_responsibleFor` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_author_id_fkey";

-- DropForeignKey
ALTER TABLE "_responsibleFor" DROP CONSTRAINT "_responsibleFor_A_fkey";

-- DropForeignKey
ALTER TABLE "_responsibleFor" DROP CONSTRAINT "_responsibleFor_B_fkey";

-- DropTable
DROP TABLE "Event";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "_responsibleFor";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "untis_id" INTEGER,
    "short_name" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "all_day" BOOLEAN NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "description_long" TEXT NOT NULL,
    "departements" "Departements"[] DEFAULT ARRAY[]::"Departements"[],
    "classes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "state" "EventState" NOT NULL DEFAULT 'DRAFT',
    "only_klp" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "__responsible_for" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_untis_id_key" ON "users"("untis_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_short_name_key" ON "users"("short_name");

-- CreateIndex
CREATE UNIQUE INDEX "__responsible_for_AB_unique" ON "__responsible_for"("A", "B");

-- CreateIndex
CREATE INDEX "__responsible_for_B_index" ON "__responsible_for"("B");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "__responsible_for" ADD CONSTRAINT "__responsible_for_A_fkey" FOREIGN KEY ("A") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "__responsible_for" ADD CONSTRAINT "__responsible_for_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
