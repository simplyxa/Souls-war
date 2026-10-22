import { BadRequestException } from '@nestjs/common';
import { CombatService } from './combat.service';
import { CombatActionType } from './combat.dto';

describe('CombatService', () => {
  it('rejects actions when the player is not in combat', async () => {
    const tx = {};
    const prisma: any = { $transaction: (fn: any) => fn(tx) };
    const players: any = {
      requirePlayer: jest.fn().mockResolvedValue({ id: 1 }),
      findActiveCombat: jest.fn().mockResolvedValue(null),
    };
    const service = new CombatService(prisma, players, {} as any, {} as any, {} as any);
    await expect(service.act(1, { action: CombatActionType.ATTACK })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects USE_ITEM without itemId', async () => {
    const tx: any = {
      $queryRaw: jest.fn(),
      combat: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 1, status: 'ACTIVE', npcHp: 10 }),
      },
    };
    const prisma: any = { $transaction: (fn: any) => fn(tx) };
    const players: any = {
      requirePlayer: jest.fn().mockResolvedValue({ id: 1 }),
      findActiveCombat: jest.fn().mockResolvedValue({ id: 1, npc: { id: 1 } }),
      effectiveStats: jest.fn().mockResolvedValue({}),
    };
    const service = new CombatService(prisma, players, {} as any, {} as any, {} as any);
    await expect(service.act(1, { action: CombatActionType.USE_ITEM })).rejects.toThrow(
      BadRequestException,
    );
  });
});
