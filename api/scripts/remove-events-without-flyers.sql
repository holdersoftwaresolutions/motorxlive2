BEGIN;

-- Delete streams tied to events missing flyers
DELETE FROM "Stream"
WHERE "eventId" IN (
  SELECT id
  FROM "Event"
  WHERE "heroImageUrl" IS NULL
     OR TRIM("heroImageUrl") = ''
);

-- Delete videos tied to events missing flyers
DELETE FROM "Video"
WHERE "eventId" IN (
  SELECT id
  FROM "Event"
  WHERE "heroImageUrl" IS NULL
     OR TRIM("heroImageUrl") = ''
);

-- Delete notifications tied to events missing flyers
DELETE FROM "NotificationLog"
WHERE "eventId" IN (
  SELECT id
  FROM "Event"
  WHERE "heroImageUrl" IS NULL
     OR TRIM("heroImageUrl") = ''
);

-- Finally delete the events
DELETE FROM "Event"
WHERE "heroImageUrl" IS NULL
   OR TRIM("heroImageUrl") = '';

COMMIT;