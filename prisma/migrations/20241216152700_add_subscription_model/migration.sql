-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "subscribe_to_affected" BOOLEAN NOT NULL DEFAULT true,
    "ics_locator" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_subscription_to_events" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "_subscription_to_classes" (
    "A" UUID NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_subscription_to_departments" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_ics_locator_key" ON "subscriptions"("ics_locator");

-- CreateIndex
CREATE UNIQUE INDEX "_subscription_to_events_AB_unique" ON "_subscription_to_events"("A", "B");

-- CreateIndex
CREATE INDEX "_subscription_to_events_B_index" ON "_subscription_to_events"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_subscription_to_classes_AB_unique" ON "_subscription_to_classes"("A", "B");

-- CreateIndex
CREATE INDEX "_subscription_to_classes_B_index" ON "_subscription_to_classes"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_subscription_to_departments_AB_unique" ON "_subscription_to_departments"("A", "B");

-- CreateIndex
CREATE INDEX "_subscription_to_departments_B_index" ON "_subscription_to_departments"("B");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_subscription_to_events" ADD CONSTRAINT "_subscription_to_events_A_fkey" FOREIGN KEY ("A") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_subscription_to_events" ADD CONSTRAINT "_subscription_to_events_B_fkey" FOREIGN KEY ("B") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_subscription_to_classes" ADD CONSTRAINT "_subscription_to_classes_A_fkey" FOREIGN KEY ("A") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_subscription_to_classes" ADD CONSTRAINT "_subscription_to_classes_B_fkey" FOREIGN KEY ("B") REFERENCES "untis_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_subscription_to_departments" ADD CONSTRAINT "_subscription_to_departments_A_fkey" FOREIGN KEY ("A") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_subscription_to_departments" ADD CONSTRAINT "_subscription_to_departments_B_fkey" FOREIGN KEY ("B") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;


BEGIN;
-- migrate records from ics-locator to subscriptions: users.ics_locator -> subsctiptions (ics_locator: users.ics_locator, usr_id: users.id)

INSERT INTO "subscriptions" ("user_id", "ics_locator")
SELECT "id", "ics_locator"
FROM "users"
WHERE "ics_locator" IS NOT NULL;

-- DropColumn

ALTER TABLE "users"
DROP COLUMN "ics_locator";

COMMIT;