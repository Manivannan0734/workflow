-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "dept" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateSource" TEXT NOT NULL DEFAULT 'WEB',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
