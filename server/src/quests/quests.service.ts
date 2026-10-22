import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlayersService } from '../players/players.service';
import { InventoryService } from '../inventory/inventory.service';
import { LogsService } from '../logs/logs.service';

type Db = Prisma.TransactionClient;

@Injectable()
export class QuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly players: PlayersService,
    private readonly inventory: InventoryService,
    private readonly logs: LogsService,
  ) {}

  /**
   * Quest status for a player: COMPLETED / ACTIVE / AVAILABLE (level and prerequisite met).
   * Locked quests are hidden from the list.
   */
  async list(userId: number) {
    const player = await this.players.getByUserId(userId);
    const [quests, mine] = await Promise.all([
      this.prisma.quest.findMany({
        orderBy: { id: 'asc' },
        include: {
          targetNpc: { select: { id: true, name: true } },
          giverLocation: { select: { id: true, name: true } },
        },
      }),
      this.prisma.playerQuest.findMany({ where: { playerId: player.id } }),
    ]);
    const items = await this.prisma.item.findMany({
      where: { id: { in: quests.map((q) => q.rewardItemId).filter((x): x is number => !!x) } },
      select: { id: true, name: true },
    });
    const byQuest = new Map(mine.map((m) => [m.questId, m]));
    const result = [];
    for (const q of quests) {
      const pq = byQuest.get(q.id);
      let status: 'AVAILABLE' | 'ACTIVE' | 'COMPLETED';
      if (pq) status = pq.status;
      else {
        const prereqDone =
          !q.prerequisiteId || byQuest.get(q.prerequisiteId)?.status === 'COMPLETED';
        if (player.level < q.minLevel || !prereqDone) continue;
        status = 'AVAILABLE';
      }
      const progress = pq?.progress ?? 0;
      result.push({
        id: q.id,
        title: q.title,
        description: q.description,
        minLevel: q.minLevel,
        status,
        progress,
        targetCount: q.targetCount,
        ready: status === 'ACTIVE' && progress >= q.targetCount,
        targetNpc: q.targetNpc,
        giverLocation: q.giverLocation,
        rewards: {
          exp: q.rewardExp,
          gold: q.rewardGold,
          item: items.find((i) => i.id === q.rewardItemId) ?? null,
        },
      });
    }
    return result;
  }

  async accept(userId: number, questId: number) {
    return this.prisma.$transaction(async (tx) => {
      const player = await this.players.getByUserId(userId, tx);
      const quest = await tx.quest.findUnique({ where: { id: questId } });
      if (!quest) throw new NotFoundException('Quest not found');
      if (
        await tx.playerQuest.findUnique({
          where: { playerId_questId: { playerId: player.id, questId } },
        })
      ) {
        throw new BadRequestException('Quest was already accepted');
      }
      if (player.level < quest.minLevel)
        throw new BadRequestException(`Requires level ${quest.minLevel}`);
      if (quest.prerequisiteId) {
        const pre = await tx.playerQuest.findUnique({
          where: { playerId_questId: { playerId: player.id, questId: quest.prerequisiteId } },
        });
        if (pre?.status !== 'COMPLETED')
          throw new BadRequestException('Complete the previous quest first');
      }
      if (quest.giverLocationId && quest.giverLocationId !== player.locationId) {
        throw new BadRequestException('The quest giver is in another location');
      }
      await tx.playerQuest.create({ data: { playerId: player.id, questId } });
      await this.logs.add(tx, player.id, `Вы приняли задание «${quest.title}».`);
      return { message: `Quest accepted: ${quest.title}` };
    });
  }

  async complete(userId: number, questId: number) {
    return this.prisma.$transaction(async (tx) => {
      let player = await this.players.getByUserId(userId, tx);
      const pq = await tx.playerQuest.findUnique({
        where: { playerId_questId: { playerId: player.id, questId } },
        include: { quest: true },
      });
      if (!pq || pq.status !== 'ACTIVE') throw new BadRequestException('This quest is not active');
      if (pq.progress < pq.quest.targetCount)
        throw new BadRequestException('Quest objectives are not complete yet');
      await tx.playerQuest.update({ where: { id: pq.id }, data: { status: 'COMPLETED' } });
      const messages = [
        `Задание «${pq.quest.title}» выполнено! Награда: ${pq.quest.rewardExp} опыта, ${pq.quest.rewardGold} золота.`,
      ];
      player = await tx.player.update({
        where: { id: player.id },
        data: { gold: { increment: pq.quest.rewardGold } },
      });
      if (pq.quest.rewardItemId) {
        const item = await tx.item.findUnique({ where: { id: pq.quest.rewardItemId } });
        if (item) {
          await this.inventory.grant(tx, player.id, item.id, 1);
          messages.push(`Вы получили предмет «${item.name}».`);
        }
      }
      const exp = await this.players.addExp(tx, player, pq.quest.rewardExp);
      messages.push(...exp.messages);
      await this.logs.add(tx, player.id, messages);
      return { messages };
    });
  }

  /** Called by the combat module after a victory: advances matching active quests. */
  async registerKill(db: Db, playerId: number, npcId: number): Promise<string[]> {
    const active = await db.playerQuest.findMany({
      where: { playerId, status: 'ACTIVE', quest: { targetNpcId: npcId } },
      include: { quest: true },
    });
    const messages: string[] = [];
    for (const pq of active) {
      if (pq.progress >= pq.quest.targetCount) continue;
      const progress = pq.progress + 1;
      await db.playerQuest.update({ where: { id: pq.id }, data: { progress } });
      messages.push(
        progress >= pq.quest.targetCount
          ? `Задание «${pq.quest.title}»: цель достигнута, можно сдать!`
          : `Задание «${pq.quest.title}»: ${progress}/${pq.quest.targetCount}.`,
      );
    }
    return messages;
  }
}
