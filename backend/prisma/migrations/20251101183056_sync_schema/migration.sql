/*
  Warnings:

  - You are about to drop the column `appliedDate` on the `job` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Made the column `location` on table `job` required. This step will fail if there are existing NULL values in that column.
  - Made the column `link` on table `job` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `job` DROP FOREIGN KEY `Job_userId_fkey`;

-- DropIndex
DROP INDEX `Job_userId_fkey` ON `job`;

-- AlterTable
ALTER TABLE `job` DROP COLUMN `appliedDate`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ALTER COLUMN `status` DROP DEFAULT,
    MODIFY `location` VARCHAR(191) NOT NULL,
    MODIFY `link` VARCHAR(191) NOT NULL,
    MODIFY `userId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
