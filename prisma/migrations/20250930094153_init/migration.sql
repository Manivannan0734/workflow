-- AlterTable
ALTER TABLE "public"."Group" ADD COLUMN     "is_deleted" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "is_deleted" BOOLEAN DEFAULT false;
