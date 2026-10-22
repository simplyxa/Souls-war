import {
  applyExp,
  attackPower,
  critChance,
  dodgeChance,
  expToNext,
  fleeChance,
  hitDamage,
  playerDefense,
  regenEnergy,
} from './formulas';

describe('formulas', () => {
  it('computes attack power and defense', () => {
    expect(attackPower({ strength: 10, damage: 5 })).toBe(22);
    expect(playerDefense({ strength: 10, armor: 3 })).toBe(5);
  });

  it('hitDamage is deterministic with a fixed rng and never below 1', () => {
    expect(hitDamage(20, 5, () => 0.5)).toBe(15); // 20 * 1.0 - 5
    expect(hitDamage(20, 5, () => 0)).toBe(12); // 20 * 0.85 - 5
    expect(hitDamage(1, 100, () => 0.5)).toBe(1);
  });

  it('keeps probabilities within bounds', () => {
    expect(dodgeChance(100, 0)).toBe(0.6);
    expect(dodgeChance(0, 100)).toBe(0);
    expect(dodgeChance(5, 5, true)).toBeCloseTo(0.25);
    expect(fleeChance(100, 0)).toBe(0.9);
    expect(fleeChance(0, 100)).toBe(0.1);
    expect(critChance(1000)).toBe(0.5);
  });

  it('applies multiple level ups', () => {
    const base = {
      level: 1,
      exp: 0,
      hp: 10,
      maxHp: 40,
      energy: 1,
      maxEnergy: 20,
      strength: 5,
      dexterity: 5,
      intelligence: 5,
    };
    const { progress, levelsGained } = applyExp(base, expToNext(1) + expToNext(2) + 7);
    expect(levelsGained).toBe(2);
    expect(progress).toMatchObject({
      level: 3,
      exp: 7,
      maxHp: 56,
      hp: 56,
      strength: 7,
      energy: 24,
    });
  });

  it('regenerates energy lazily', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const now = new Date(start.getTime() + 150_000);
    const r = regenEnergy(5, 20, start, now, 60_000);
    expect(r.energy).toBe(7);
    expect(r.energyAt.getTime()).toBe(start.getTime() + 120_000);
    expect(regenEnergy(19, 20, start, new Date(start.getTime() + 600_000), 60_000).energy).toBe(20);
  });
});
