-- AlterTable
ALTER TABLE "past_exams" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- Update existing records to set displayOrder based on year and examNumber
UPDATE "past_exams" SET "displayOrder" = (
  SELECT COUNT(*) * 1000 
  FROM "past_exams" p2 
  WHERE p2."userId" = "past_exams"."userId" 
    AND p2."schoolName" = "past_exams"."schoolName"
    AND (
      p2."year" > "past_exams"."year" 
      OR (p2."year" = "past_exams"."year" AND p2."examNumber" > "past_exams"."examNumber")
    )
);

