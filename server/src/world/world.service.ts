import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlayersService } from '../players/players.service';
import { LogsService } from '../logs/logs.service';
import { ENERGY_COST_MOVE, INN_PRICE } from '../game/constants';

@Injectable()
export class WorldService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly players: PlayersService,
    private readonly logs: LogsService,
  ) {}

  async currentLocation(userId: number) {
    const player = await this.players.requirePlayer(userId);
    const location = await this.prisma.location.findUnique({
      where: { id: player.locationId },
      include: {
        npcs: { orderBy: { id: 'asc' } },
        exits: { include: { to: { select: { id: true, name: true } } }, orderBy: { toId: 'asc' } },
      },
    });
    if (!location) throw new NotFoundException('Location not found');

    const npcs = location.npcs.map((n) => ({
      id: n.id,
      name: n.name,
      description: n.description,
      type: n.type,
      level: n.level,
    }));
    const actions: { type: string; label: string }[] = [];
    if (npcs.some((n) => n.type === 'MONSTER'))
      actions.push({ type: 'FIGHT', label: 'Напасть на врага' });
    if (npcs.some((n) => n.type === 'MERCHANT'))
      actions.push({ type: 'TRADE', label: 'Торговать' });
    if (location.hasInn) {
      actions.push({ type: 'REST', label: `Отдохнуть в таверне (${INN_PRICE} золота)` });
    }
    if (location.exits.length)
      actions.push({ type: 'MOVE', label: 'Отправиться в другую локацию' });

    return {
      id: location.id,
      name: location.name,
      description: location.description,
      hasInn: location.hasInn,
      npcs,
      exits: location.exits.map((e) => ({
        locationId: e.to.id,
        name: e.to.name,
        minLevel: e.minLevel,
        accessible: player.level >= e.minLevel,
      })),
      actions,
    };
  }

  async move(userId: number, targetId: number) {
    return this.prisma.$transaction(async (tx) => {
      let player = await this.players.requirePlayer(userId, tx);
      await this.players.assertNotInCombat(tx, player.id);
      const link = await tx.locationLink.findUnique({
        where: { fromId_toId: { fromId: player.locationId, toId: targetId } },
        include: { to: true },
      });
      if (!link) throw new BadRequestException('This location is not reachable from here');
      if (player.level < link.minLevel) {
        throw new BadRequestException(`Requires level ${link.minLevel} to enter ${link.to.name}`);
      }
      player = await this.players.spendEnergy(tx, player, ENERGY_COST_MOVE);
      await tx.player.update({ where: { id: player.id }, data: { locationId: link.toId } });
      await this.logs.add(tx, player.id, `Вы отправились в локацию «${link.to.name}».`);
      return { locationId: link.toId, name: link.to.name };
    });
  }

  async rest(userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const player = await this.players.requirePlayer(userId, tx);
      await this.players.assertNotInCombat(tx, player.id);
      const location = await tx.location.findUnique({ where: { id: player.locationId } });
      if (!location?.hasInn) throw new BadRequestException('There is no inn in this location');
      if (player.gold < INN_PRICE) throw new BadRequestException('Not enough gold');
      await tx.player.update({
        where: { id: player.id },
        data: {
          gold: player.gold - INN_PRICE,
          hp: player.maxHp,
          energy: player.maxEnergy,
          energyAt: new Date(),
        },
      });
      await this.logs.add(
        tx,
        player.id,
        `Вы отдохнули в таверне за ${INN_PRICE} золота. HP и энергия восстановлены.`,
      );
      return { gold: player.gold - INN_PRICE, hp: player.maxHp, energy: player.maxEnergy };
    });
  }
}
