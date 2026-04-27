/*
  Warnings:

  - The `job` column on the `ProjectMember` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ProjectMember" DROP COLUMN "job",
ADD COLUMN     "job" TEXT;

-- DropEnum
DROP TYPE "Job";
