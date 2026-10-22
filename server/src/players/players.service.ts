import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Player, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ENERGY_REGEN_MS } from '../game/constants';
import { CombatStats, applyExp, expToNext, regenEnergy } from '../game/formulas';

type Db = Prisma.TransactionClient;

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async getByUserId(userId: number, db: Db = this.prisma): Promise<Player> {
    const player = await db.player.findUnique({ where: { userId } });
    if (!player) throw new NotFoundException('Character not found');
    return player;
  }

  /** Loads the player and applies lazy energy regeneration. */
  async requirePlayer(userId: number, db: Db = this.prisma): Promise<Player> {
    const player = await this.getByUserId(userId, db);
    const regen = regenEnergy(
      player.energy,
      player.maxEnergy,
      player.energyAt,
      new Date(),
      ENERGY_REGEN_MS,
    );
    if (regen.energy === player.energy && regen.energyAt.getTime() === player.energyAt.getTime()) {
      return player;
    }
    return db.player.update({ where: { id: player.id }, data: regen });
  }

  async effectiveStats(db: Db, player: Player): Promise<CombatStats> {
    const equipped = await db.inventoryItem.findMany({
      where: { playerId: player.id, equipped: true },
      include: { item: true },
    });
    const stats: CombatStats = {
      strength: player.strength,
      dexterity: player.dexterity,
      intelligence: player.intelligence,
      damage: 0,
      armor: 0,
    };
    for (const { item } of equipped) {
      stats.strength += item.bonusStr;
      stats.dexterity += item.bonusDex;
      stats.intelligence += item.bonusInt;
      stats.damage += item.damage;
      stats.armor += item.armor;
    }
    return stats;
  }

  async findActiveCombat(db: Db, playerId: number) {
    return db.combat.findFirst({ where: { playerId, status: 'ACTIVE' }, include: { npc: true } });
  }

  async assertNotInCombat(db: Db, playerId: number) {
    if (await this.findActiveCombat(db, playerId)) {
      throw new BadRequestException('You cannot do this while in combat');
    }
  }

  async spendEnergy(db: Db, player: Player, cost: number): Promise<Player> {
    if (player.energy < cost) {
      throw new BadRequestException(`Not enough energy (need ${cost}, have ${player.energy})`);
    }
    const energyAt = player.energy >= player.maxEnergy ? new Date() : player.energyAt;
    return db.player.update({
      where: { id: player.id },
      data: { energy: player.energy - cost, energyAt },
    });
  }

  /** Grants experience (applying level ups) and returns the updated player and log lines. */
  async addExp(
    db: Db,
    player: Player,
    exp: number,
  ): Promise<{ player: Player; messages: string[] }> {
    const { progress, levelsGained } = applyExp(player, exp);
    const updated = await db.player.update({
      where: { id: player.id },
      data: {
        level: progress.level,
        exp: progress.exp,
        hp: progress.hp,
        maxHp: progress.maxHp,
        energy: progress.energy,
        maxEnergy: progress.maxEnergy,
        strength: progress.strength,
        dexterity: progress.dexterity,
        intelligence: progress.intelligence,
      },
    });
    const messages: string[] = [];
    if (levelsGained > 0) {
      messages.push(
        `Новый уровень! Теперь вы ${progress.level} уровня. Характеристики выросли, HP и энергия восстановлены.`,
      );
    }
    return { player: updated, messages };
  }

  async view(player: Player) {
    const stats = await this.effectiveStats(this.prisma, player);
    const [location, combat] = await Promise.all([
      this.prisma.location.findUnique({
        where: { id: player.locationId },
        select: { id: true, name: true },
      }),
      this.findActiveCombat(this.prisma, player.id),
    ]);
    return {
      id: player.id,
      name: player.name,
      level: player.level,
      exp: player.exp,
      expToNext: expToNext(player.level),
      hp: player.hp,
      maxHp: player.maxHp,
      energy: player.energy,
      maxEnergy: player.maxEnergy,
      gold: player.gold,
      baseStats: {
        strength: player.strength,
        dexterity: player.dexterity,
        intelligence: player.intelligence,
      },
      stats,
      location,
      inCombat: !!combat,
    };
  }

  leaderboard() {
    return this.prisma.player.findMany({
      orderBy: [{ level: 'desc' }, { exp: 'desc' }],
      take: 20,
      select: { name: true, level: true, exp: true },
    });
  }
}
