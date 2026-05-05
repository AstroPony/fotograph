-- AlterTable
ALTER TABLE "User" ADD COLUMN "mollieCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MolliePayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mollieId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MolliePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MolliePayment_mollieId_key" ON "MolliePayment"("mollieId");

-- CreateIndex
CREATE INDEX "MolliePayment_userId_idx" ON "MolliePayment"("userId");

-- CreateIndex
CREATE INDEX "MolliePayment_mollieId_idx" ON "MolliePayment"("mollieId");

-- AddForeignKey
ALTER TABLE "MolliePayment" ADD CONSTRAINT "MolliePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
