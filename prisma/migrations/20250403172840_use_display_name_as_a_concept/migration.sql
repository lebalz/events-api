-- AlterTable
ALTER TABLE "departments" ADD COLUMN "display_letter" TEXT;

-- AlterTable
ALTER TABLE "departments" RENAME COLUMN "classLetters" TO "class_letters";

-- AlterTable
ALTER TABLE "untis_classes" RENAME COLUMN "legacy_name" TO "display_name";

-- AlterIndex
ALTER INDEX "untis_classes_legacy_name_key" RENAME TO "untis_classes_display_name_key";


-- alter data

UPDATE "departments" set display_letter = letter where name = 'FMPäd' or name = 'MSOP';
UPDATE "departments" set letter = 'E' where name = 'FMPäd';
UPDATE "departments" set letter = 'e' where name = 'MSOP';
UPDATE "untis_classes" set display_name = COALESCE(display_name, name) where name ~ '^\d\dF[pqrs]$' or name ~ '^\d\ds[PQRS]$';
UPDATE "untis_classes" set name = REPLACE(name, 'F', 'E') where name ~ '^\d\dF[pqrs]$';
UPDATE "untis_classes" set name = REPLACE(name, 's', 'e') where name ~ '^\d\ds[PQRS]$';

-- alter events
UPDATE "events"
SET classes = ARRAY(
    SELECT CASE
        WHEN value ~ '^\d\dF[pqrs]$' THEN REPLACE(value, 'F', 'E')
        WHEN value ~ '^\d\ds[PQRS]$' THEN REPLACE(value, 's', 'e')
        ELSE value
    END
    FROM unnest(classes) AS value
)
WHERE EXISTS (
    SELECT 1
    FROM unnest(classes) AS value
    WHERE value ~ '^\d\dF[pqrs]$' or value ~ '^\d\ds[PQRS]$'
);