import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Player, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlayersService } from '../players/players.service';
import { LogsService } from '../logs/logs.service';

type Db = Prisma.TransactionClient;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly players: PlayersService,
    private readonly logs: LogsService,
  ) {}

  async list(userId: number) {
    const player = await this.players.getByUserId(userId);
    return this.listFor(this.prisma, player.id);
  }

  private async listFor(db: Db, playerId: number) {
    const rows = await db.inventoryItem.findMany({
      where: { playerId },
      include: { item: true },
      orderBy: { itemId: 'asc' },
    });
    return rows.map((r) => ({
      itemId: r.itemId,
      quantity: r.quantity,
      equipped: r.equipped,
      item: r.item,
    }));
  }

  async grant(db: Db, playerId: number, itemId: number, quantity = 1) {
    await db.inventoryItem.upsert({
      where: { playerId_itemId: { playerId, itemId } },
      create: { playerId, itemId, quantity },
      update: { quantity: { increment: quantity } },
    });
  }

  /** Removes `quantity` of an item; throws if the player does not own enough. */
  async take(db: Db, playerId: number, itemId: number, quantity = 1) {
    const row = await db.inventoryItem.findUnique({
      where: { playerId_itemId: { playerId, itemId } },
    });
    if (!row || row.quantity < quantity) throw new BadRequestException('You do not have this item');
    if (row.quantity === quantity) await db.inventoryItem.delete({ where: { id: row.id } });
    else
      await db.inventoryItem.update({
        where: { id: row.id },
        data: { quantity: { decrement: quantity } },
      });
  }

  /**
   * Consumes one potion and applies its effect. Shared by out-of-combat use and the
   * combat USE_ITEM action. Returns the log message and updated player.
   */
  async consume(
    db: Db,
    player: Player,
    itemId: number,
  ): Promise<{ message: string; player: Player }> {
    const row = await db.inventoryItem.findUnique({
      where: { playerId_itemId: { playerId: player.id, itemId } },
      include: { item: true },
    });
    if (!row || row.quantity < 1) throw new BadRequestException('You do not have this item');
    const item = row.item;
    if (item.type !== 'CONSUMABLE') throw new BadRequestException('This item cannot be used');
    const hp = Math.min(player.maxHp, player.hp + item.healHp);
    const energy = Math.min(player.maxEnergy, player.energy + item.restoreEnergy);
    if (hp === player.hp && energy === player.energy) {
      throw new BadRequestException('This item would have no effect right now');
    }
    await this.take(db, player.id, itemId, 1);
    const updated = await db.player.update({
      where: { id: player.id },
      data: { hp, energy, ...(player.energy >= player.maxEnergy ? { energyAt: new Date() } : {}) },
    });
    const parts: string[] = [];
    if (hp > player.hp) parts.push(`+${hp - player.hp} HP`);
    if (energy > player.energy) parts.push(`+${energy - player.energy} энергии`);
    return { message: `Вы использовали «${item.name}» (${parts.join(', ')}).`, player: updated };
  }

  async use(userId: number, itemId: number) {
    return this.prisma.$transaction(async (tx) => {
      const player = await this.players.requirePlayer(userId, tx);
      await this.players.assertNotInCombat(tx, player.id);
      const { message, player: updated } = await this.consume(tx, player, itemId);
      await this.logs.add(tx, player.id, message);
      return { message, hp: updated.hp, energy: updated.energy };
    });
  }

  async equip(userId: number, itemId: number) {
    return this.prisma.$transaction(async (tx) => {
      const player = await this.players.getByUserId(userId, tx);
      await this.players.assertNotInCombat(tx, player.id);
      const row = await tx.inventoryItem.findUnique({
        where: { playerId_itemId: { playerId: player.id, itemId } },
        include: { item: true },
      });
      if (!row) throw new BadRequestException('You do not have this item');
      if (row.item.type === 'CONSUMABLE')
        throw new BadRequestException('Consumables cannot be equipped');
      await tx.inventoryItem.updateMany({
        where: { playerId: player.id, equipped: true, item: { type: row.item.type } },
        data: { equipped: false },
      });
      await tx.inventoryItem.update({ where: { id: row.id }, data: { equipped: true } });
      await this.logs.add(tx, player.id, `Вы экипировали «${row.item.name}».`);
      return this.listFor(tx, player.id);
    });
  }

  async unequip(userId: number, itemId: number) {
    return this.prisma.$transaction(async (tx) => {
      const player = await this.players.getByUserId(userId, tx);
      await this.players.assertNotInCombat(tx, player.id);
      const row = await tx.inventoryItem.findUnique({
        where: { playerId_itemId: { playerId: player.id, itemId } },
        include: { item: true },
      });
      if (!row) throw new NotFoundException('You do not have this item');
      if (!row.equipped) throw new BadRequestException('This item is not equipped');
      await tx.inventoryItem.update({ where: { id: row.id }, data: { equipped: false } });
      await this.logs.add(tx, player.id, `Вы сняли «${row.item.name}».`);
      return this.listFor(tx, player.id);
    });
  }
}
