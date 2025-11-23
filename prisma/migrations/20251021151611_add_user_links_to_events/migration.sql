-- CreateTable
CREATE TABLE "_events_to_users" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_events_to_users_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_events_to_users_B_index" ON "_events_to_users"("B");

-- AddForeignKey
ALTER TABLE "_events_to_users" ADD CONSTRAINT "_events_to_users_A_fkey" FOREIGN KEY ("A") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_events_to_users" ADD CONSTRAINT "_events_to_users_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
