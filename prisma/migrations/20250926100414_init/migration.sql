-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "User_id_seq";
