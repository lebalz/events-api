-- AlterTable
ALTER TABLE "_classes_to_lessons" ADD CONSTRAINT "_classes_to_lessons_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_classes_to_lessons_AB_unique";

-- AlterTable
ALTER TABLE "_events_to_departments" ADD CONSTRAINT "_events_to_departments_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_events_to_departments_AB_unique";

-- AlterTable
ALTER TABLE "_events_to_event_groups" ADD CONSTRAINT "_events_to_event_groups_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_events_to_event_groups_AB_unique";

-- AlterTable
ALTER TABLE "_registration_periods_to_departments" ADD CONSTRAINT "_registration_periods_to_departments_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_registration_periods_to_departments_AB_unique";

-- AlterTable
ALTER TABLE "_subscription_to_classes" ADD CONSTRAINT "_subscription_to_classes_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_subscription_to_classes_AB_unique";

-- AlterTable
ALTER TABLE "_subscription_to_departments" ADD CONSTRAINT "_subscription_to_departments_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_subscription_to_departments_AB_unique";

-- AlterTable
ALTER TABLE "_subscription_to_events" ADD CONSTRAINT "_subscription_to_events_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_subscription_to_events_AB_unique";

-- AlterTable
ALTER TABLE "_teachers_to_classes" ADD CONSTRAINT "_teachers_to_classes_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_teachers_to_classes_AB_unique";

-- AlterTable
ALTER TABLE "_teachers_to_lessons" ADD CONSTRAINT "_teachers_to_lessons_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_teachers_to_lessons_AB_unique";

-- AlterTable
ALTER TABLE "_users_to_event_groups" ADD CONSTRAINT "_users_to_event_groups_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_users_to_event_groups_AB_unique";
