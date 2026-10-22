-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLAYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "NpcType" AS ENUM ('MONSTER', 'FRIENDLY', 'MERCHANT');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('CONSUMABLE', 'WEAPON', 'ARMOR');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CombatStatus" AS ENUM ('ACTIVE', 'WON', 'LOST', 'FLED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hasInn" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationLink" (
    "id" SERIAL NOT NULL,
    "fromId" INTEGER NOT NULL,
    "toId" INTEGER NOT NULL,
    "minLevel" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "LocationLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" "ItemType" NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "damage" INTEGER NOT NULL DEFAULT 0,
    "armor" INTEGER NOT NULL DEFAULT 0,
    "bonusStr" INTEGER NOT NULL DEFAULT 0,
    "bonusDex" INTEGER NOT NULL DEFAULT 0,
    "bonusInt" INTEGER NOT NULL DEFAULT 0,
    "healHp" INTEGER NOT NULL DEFAULT 0,
    "restoreEnergy" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Npc" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" "NpcType" NOT NULL,
    "locationId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "maxHp" INTEGER NOT NULL DEFAULT 20,
    "attack" INTEGER NOT NULL DEFAULT 3,
    "defense" INTEGER NOT NULL DEFAULT 0,
    "agility" INTEGER NOT NULL DEFAULT 1,
    "expReward" INTEGER NOT NULL DEFAULT 10,
    "goldReward" INTEGER NOT NULL DEFAULT 5,
    "dropItemId" INTEGER,
    "dropChance" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Npc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopEntry" (
    "id" SERIAL NOT NULL,
    "npcId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,

    CONSTRAINT "ShopEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "hp" INTEGER NOT NULL DEFAULT 40,
    "maxHp" INTEGER NOT NULL DEFAULT 40,
    "energy" INTEGER NOT NULL DEFAULT 20,
    "maxEnergy" INTEGER NOT NULL DEFAULT 20,
    "energyAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gold" INTEGER NOT NULL DEFAULT 50,
    "strength" INTEGER NOT NULL DEFAULT 5,
    "dexterity" INTEGER NOT NULL DEFAULT 5,
    "intelligence" INTEGER NOT NULL DEFAULT 5,
    "locationId" INTEGER NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "equipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "giverLocationId" INTEGER,
    "targetNpcId" INTEGER NOT NULL,
    "targetCount" INTEGER NOT NULL DEFAULT 1,
    "rewardExp" INTEGER NOT NULL DEFAULT 0,
    "rewardGold" INTEGER NOT NULL DEFAULT 0,
    "rewardItemId" INTEGER,
    "prerequisiteId" INTEGER,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerQuest" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "questId" INTEGER NOT NULL,
    "status" "QuestStatus" NOT NULL DEFAULT 'ACTIVE',
    "progress" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Combat" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "npcId" INTEGER NOT NULL,
    "npcHp" INTEGER NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "status" "CombatStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Combat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LocationLink_fromId_toId_key" ON "LocationLink"("fromId", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Npc_name_key" ON "Npc"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ShopEntry_npcId_itemId_key" ON "ShopEntry"("npcId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_name_key" ON "Player"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_playerId_itemId_key" ON "InventoryItem"("playerId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Quest_title_key" ON "Quest"("title");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerQuest_playerId_questId_key" ON "PlayerQuest"("playerId", "questId");

-- CreateIndex
CREATE INDEX "Combat_playerId_status_idx" ON "Combat"("playerId", "status");

-- CreateIndex
CREATE INDEX "ActionLog_playerId_id_idx" ON "ActionLog"("playerId", "id");

-- AddForeignKey
ALTER TABLE "LocationLink" ADD CONSTRAINT "LocationLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationLink" ADD CONSTRAINT "LocationLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Npc" ADD CONSTRAINT "Npc_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopEntry" ADD CONSTRAINT "ShopEntry_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "Npc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopEntry" ADD CONSTRAINT "ShopEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_giverLocationId_fkey" FOREIGN KEY ("giverLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_targetNpcId_fkey" FOREIGN KEY ("targetNpcId") REFERENCES "Npc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerQuest" ADD CONSTRAINT "PlayerQuest_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerQuest" ADD CONSTRAINT "PlayerQuest_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combat" ADD CONSTRAINT "Combat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combat" ADD CONSTRAINT "Combat_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "Npc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
