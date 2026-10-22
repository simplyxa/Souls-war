import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlayersService } from '../players/players.service';
import { InventoryService } from '../inventory/inventory.service';
import { LogsService } from '../logs/logs.service';
import { SELL_RATIO } from '../game/constants';

const sellPrice = (price: number) => Math.floor(price * SELL_RATIO);

@Injectable()
export class ShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly players: PlayersService,
    private readonly inventory: InventoryService,
    private readonly logs: LogsService,
  ) {}

  /** Merchants of the player's current location with their goods and the player's sellable items. */
  async view(userId: number) {
    const player = await this.players.getByUserId(userId);
    const merchants = await this.prisma.npc.findMany({
      where: { locationId: player.locationId, type: 'MERCHANT' },
      include: { shop: { include: { item: true }, orderBy: { itemId: 'asc' } } },
    });
    const inv = await this.prisma.inventoryItem.findMany({
      where: { playerId: player.id },
      include: { item: true },
      orderBy: { itemId: 'asc' },
    });
    return {
      gold: player.gold,
      merchants: merchants.map((m) => ({
        id: m.id,
        name: m.name,
        goods: m.shop.map((s) => ({ item: s.item, buyPrice: s.item.price })),
      })),
      sellable: inv.map((r) => ({
        item: r.item,
        quantity: r.quantity,
        equipped: r.equipped,
        sellPrice: sellPrice(r.item.price),
      })),
    };
  }

  async buy(userId: number, itemId: number, quantity: number) {
    return this.prisma.$transaction(async (tx) => {
      const player = await this.players.getByUserId(userId, tx);
      await this.players.assertNotInCombat(tx, player.id);
      const entry = await tx.shopEntry.findFirst({
        where: { itemId, npc: { locationId: player.locationId, type: 'MERCHANT' } },
        include: { item: true },
      });
      if (!entry) throw new BadRequestException('No merchant here sells this item');
      const total = entry.item.price * quantity;
      if (player.gold < total) throw new BadRequestException(`Not enough gold (need ${total})`);
      await tx.player.update({ where: { id: player.id }, data: { gold: { decrement: total } } });
      await this.inventory.grant(tx, player.id, itemId, quantity);
      await this.logs.add(
        tx,
        player.id,
        `Вы купили «${entry.item.name}» ×${quantity} за ${total} золота.`,
      );
      return { gold: player.gold - total };
    });
  }

  async sell(userId: number, itemId: number, quantity: number) {
    return this.prisma.$transaction(async (tx) => {
      const player = await this.players.getByUserId(userId, tx);
      await this.players.assertNotInCombat(tx, player.id);
      const merchant = await tx.npc.findFirst({
        where: { locationId: player.locationId, type: 'MERCHANT' },
      });
      if (!merchant) throw new BadRequestException('There is no merchant in this location');
      const row = await tx.inventoryItem.findUnique({
        where: { playerId_itemId: { playerId: player.id, itemId } },
        include: { item: true },
      });
      if (!row || row.quantity < quantity)
        throw new BadRequestException('You do not have enough of this item');
      if (row.equipped && row.quantity === quantity) {
        throw new BadRequestException('Unequip the item before selling it');
      }
      const unit = sellPrice(row.item.price);
      if (unit < 1) throw new BadRequestException('The merchant is not interested in this item');
      const total = unit * quantity;
      await this.inventory.take(tx, player.id, itemId, quantity);
      await tx.player.update({ where: { id: player.id }, data: { gold: { increment: total } } });
      await this.logs.add(
        tx,
        player.id,
        `Вы продали «${row.item.name}» ×${quantity} за ${total} золота.`,
      );
      return { gold: player.gold + total };
    });
  }
}
