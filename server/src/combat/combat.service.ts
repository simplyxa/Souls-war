import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Combat, Npc, Player, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlayersService } from '../players/players.service';
import { InventoryService } from '../inventory/inventory.service';
import { QuestsService } from '../quests/quests.service';
import { LogsService } from '../logs/logs.service';
import { DEFEAT_GOLD_LOSS, ENERGY_COST_FIGHT } from '../game/constants';
import {
  CombatStats,
  Rng,
  attackPower,
  critChance,
  dodgeChance,
  fleeChance,
  hitDamage,
  playerDefense,
} from '../game/formulas';
import { CombatActionDto, CombatActionType } from './combat.dto';

type Db = Prisma.TransactionClient;

@Injectable()
export class CombatService {
  /** Replaceable in tests for deterministic fights. */
  rng: Rng = Math.random;

  constructor(
    private readonly prisma: PrismaService,
    private readonly players: PlayersService,
    private readonly inventory: InventoryService,
    private readonly quests: QuestsService,
    private readonly logs: LogsService,
  ) {}

  private view(combat: Combat, npc: Npc, player: Player, messages: string[]) {
    return {
      id: combat.id,
      status: combat.status,
      round: combat.round,
      enemy: { id: npc.id, name: npc.name, level: npc.level, hp: combat.npcHp, maxHp: npc.maxHp },
      player: { hp: player.hp, maxHp: player.maxHp },
      messages,
    };
  }

  async current(userId: number) {
    const player = await this.players.getByUserId(userId);
    const combat = await this.players.findActiveCombat(this.prisma, player.id);
    return { combat: combat ? this.view(combat, combat.npc, player, []) : null };
  }

  async start(userId: number, npcId: number) {
    return this.prisma.$transaction(async (tx) => {
      let player = await this.players.requirePlayer(userId, tx);
      await tx.$queryRaw`SELECT id FROM "Player" WHERE id = ${player.id} FOR UPDATE`;
      await this.players.assertNotInCombat(tx, player.id);
      const npc = await tx.npc.findUnique({ where: { id: npcId } });
      if (!npc || npc.locationId !== player.locationId)
        throw new NotFoundException('There is no such enemy here');
      if (npc.type !== 'MONSTER') throw new BadRequestException('You cannot attack this character');
      if (player.hp < 1) throw new BadRequestException('You are too wounded to fight');
      player = await this.players.spendEnergy(tx, player, ENERGY_COST_FIGHT);
      const combat = await tx.combat.create({
        data: { playerId: player.id, npcId: npc.id, npcHp: npc.maxHp },
      });
      const message = `Вы вступили в бой с «${npc.name}» (ур. ${npc.level}).`;
      await this.logs.add(tx, player.id, message);
      return { combat: this.view(combat, npc, player, [message]) };
    });
  }

  async act(userId: number, dto: CombatActionDto) {
    return this.prisma.$transaction(async (tx) => {
      let player = await this.players.requirePlayer(userId, tx);
      const active = await this.players.findActiveCombat(tx, player.id);
      if (!active) throw new BadRequestException('You are not in combat');
      await tx.$queryRaw`SELECT id FROM "Combat" WHERE id = ${active.id} FOR UPDATE`;
      let combat = await tx.combat.findUniqueOrThrow({ where: { id: active.id } });
      if (combat.status !== 'ACTIVE') throw new BadRequestException('You are not in combat');
      const npc = active.npc;
      const stats = await this.players.effectiveStats(tx, player);
      const messages: string[] = [];
      let defending = false;
      let npcHp = combat.npcHp;
      let fled = false;

      switch (dto.action) {
        case CombatActionType.ATTACK:
          npcHp = this.playerAttack(stats, npc, npcHp, messages);
          break;
        case CombatActionType.DEFEND:
          defending = true;
          messages.push('Вы встали в защитную стойку.');
          break;
        case CombatActionType.USE_ITEM: {
          if (!dto.itemId) throw new BadRequestException('itemId is required for USE_ITEM');
          const used = await this.inventory.consume(tx, player, dto.itemId);
          player = used.player;
          messages.push(used.message);
          break;
        }
        case CombatActionType.FLEE: {
          const chance = fleeChance(stats.dexterity, npc.agility);
          if (this.rng() < chance) {
            fled = true;
            messages.push(`Вам удалось сбежать от «${npc.name}».`);
          } else {
            messages.push(`Побег не удался (шанс ${Math.round(chance * 100)}%).`);
          }
          break;
        }
      }

      if (fled) {
        combat = await tx.combat.update({
          where: { id: combat.id },
          data: { status: 'FLED', npcHp },
        });
      } else if (npcHp <= 0) {
        combat = await tx.combat.update({
          where: { id: combat.id },
          data: { status: 'WON', npcHp: 0 },
        });
        const result = await this.victory(tx, player, npc);
        player = result.player;
        messages.push(...result.messages);
      } else {
        player = await this.enemyTurn(tx, player, stats, npc, defending, messages);
        if (player.hp <= 0) {
          combat = await tx.combat.update({
            where: { id: combat.id },
            data: { status: 'LOST', npcHp },
          });
          player = await this.defeat(tx, player, npc, messages);
        } else {
          combat = await tx.combat.update({
            where: { id: combat.id },
            data: { npcHp, round: { increment: 1 } },
          });
        }
      }
      await this.logs.add(tx, player.id, messages);
      return { combat: this.view({ ...combat, npcHp }, npc, player, messages) };
    });
  }

  private playerAttack(stats: CombatStats, npc: Npc, npcHp: number, messages: string[]): number {
    if (this.rng() < dodgeChance(npc.agility, stats.dexterity)) {
      messages.push(`Вы атакуете, но «${npc.name}» уклоняется!`);
      return npcHp;
    }
    let dmg = hitDamage(attackPower(stats), npc.defense, this.rng);
    const crit = this.rng() < critChance(stats.intelligence);
    if (crit) dmg = Math.round(dmg * 1.5);
    messages.push(`Вы наносите «${npc.name}» ${dmg} урона${crit ? ' (критический удар!)' : ''}.`);
    return Math.max(0, npcHp - dmg);
  }

  private async enemyTurn(
    db: Db,
    player: Player,
    stats: CombatStats,
    npc: Npc,
    defending: boolean,
    messages: string[],
  ): Promise<Player> {
    if (this.rng() < dodgeChance(stats.dexterity, npc.agility, defending)) {
      messages.push(`«${npc.name}» атакует, но вы уклоняетесь!`);
      return player;
    }
    let dmg = hitDamage(npc.attack, playerDefense(stats), this.rng);
    if (defending) dmg = Math.max(1, Math.floor(dmg / 2));
    messages.push(`«${npc.name}» наносит вам ${dmg} урона${defending ? ' (блок)' : ''}.`);
    return db.player.update({
      where: { id: player.id },
      data: { hp: Math.max(0, player.hp - dmg) },
    });
  }

  private async victory(db: Db, player: Player, npc: Npc) {
    const messages = [
      `«${npc.name}» повержен! Награда: ${npc.expReward} опыта, ${npc.goldReward} золота.`,
    ];
    player = await db.player.update({
      where: { id: player.id },
      data: { gold: { increment: npc.goldReward } },
    });
    if (npc.dropItemId && this.rng() < npc.dropChance) {
      const item = await db.item.findUnique({ where: { id: npc.dropItemId } });
      if (item) {
        await this.inventory.grant(db, player.id, item.id, 1);
        messages.push(`Добыча: «${item.name}».`);
      }
    }
    messages.push(...(await this.quests.registerKill(db, player.id, npc.id)));
    const exp = await this.players.addExp(db, player, npc.expReward);
    messages.push(...exp.messages);
    return { player: exp.player, messages };
  }

  /** Defeat: lose 10% gold, respawn at the first location with half HP. */
  private async defeat(db: Db, player: Player, npc: Npc, messages: string[]): Promise<Player> {
    const start = await db.location.findFirst({ orderBy: { id: 'asc' } });
    const loss = Math.floor(player.gold * DEFEAT_GOLD_LOSS);
    messages.push(
      `Вы потерпели поражение от «${npc.name}». Потеряно ${loss} золота. Вас вынесли в безопасное место.`,
    );
    return db.player.update({
      where: { id: player.id },
      data: {
        hp: Math.max(1, Math.floor(player.maxHp / 2)),
        gold: player.gold - loss,
        ...(start ? { locationId: start.id } : {}),
      },
    });
  }
}
