/**
 * Game formulas. All functions are pure; randomness is injected (`rng` returns [0, 1))
 * so they can be unit-tested deterministically.
 *
 * Summary
 * -------
 * Effective stats  = base stats + sum of bonuses of equipped items.
 * Attack power     = 2 + 1.5 * strength + weapon damage
 * Defense          = armor + floor(strength / 4)
 * Hit damage       = max(1, round(power * (0.85 + 0.30 * rng) - defense))
 * Crit             = chance 5% + 0.5% per intelligence (max 50%), damage x1.5
 * Dodge chance     = clamp(5% + 2% * (defender dexterity - attacker dexterity)
 *                          + 20% if defender is defending, 0%, 60%)
 * Defend action    = incoming damage halved (min 1) and +20% dodge for the enemy turn
 * Flee chance      = clamp(40% + 3% * (player dexterity - enemy agility), 10%, 90%)
 * Exp to next lvl  = 100 * level; level up: +8 max HP, +1 all stats, +2 max energy, full heal
 * Energy regen     = +1 per minute (lazily computed)
 */
export type Rng = () => number;

export interface CombatStats {
  strength: number;
  dexterity: number;
  intelligence: number;
  damage: number;
  armor: number;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const attackPower = (s: Pick<CombatStats, 'strength' | 'damage'>) =>
  2 + 1.5 * s.strength + s.damage;

export const playerDefense = (s: Pick<CombatStats, 'strength' | 'armor'>) =>
  s.armor + Math.floor(s.strength / 4);

export const critChance = (intelligence: number) => clamp(0.05 + 0.005 * intelligence, 0, 0.5);

export const dodgeChance = (defenderDex: number, attackerDex: number, defending = false) =>
  clamp(0.05 + 0.02 * (defenderDex - attackerDex) + (defending ? 0.2 : 0), 0, 0.6);

export const fleeChance = (playerDex: number, enemyAgility: number) =>
  clamp(0.4 + 0.03 * (playerDex - enemyAgility), 0.1, 0.9);

export function hitDamage(power: number, defense: number, rng: Rng): number {
  return Math.max(1, Math.round(power * (0.85 + 0.3 * rng()) - defense));
}

export const expToNext = (level: number) => 100 * level;

export interface Progress {
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  strength: number;
  dexterity: number;
  intelligence: number;
}

/** Adds experience and applies as many level ups as earned. */
export function applyExp(
  p: Progress,
  gained: number,
): { progress: Progress; levelsGained: number } {
  const next = { ...p, exp: p.exp + gained };
  let levelsGained = 0;
  while (next.exp >= expToNext(next.level)) {
    next.exp -= expToNext(next.level);
    next.level += 1;
    next.maxHp += 8;
    next.maxEnergy += 2;
    next.strength += 1;
    next.dexterity += 1;
    next.intelligence += 1;
    next.hp = next.maxHp;
    next.energy = next.maxEnergy;
    levelsGained += 1;
  }
  return { progress: next, levelsGained };
}

/** Lazy energy regeneration: 1 point every `regenMs` since `energyAt`. */
export function regenEnergy(
  energy: number,
  maxEnergy: number,
  energyAt: Date,
  now: Date,
  regenMs: number,
): { energy: number; energyAt: Date } {
  if (energy >= maxEnergy) return { energy: maxEnergy, energyAt: now };
  const gained = Math.floor((now.getTime() - energyAt.getTime()) / regenMs);
  if (gained <= 0) return { energy, energyAt };
  const total = Math.min(maxEnergy, energy + gained);
  if (total >= maxEnergy) return { energy: maxEnergy, energyAt: now };
  return { energy: total, energyAt: new Date(energyAt.getTime() + gained * regenMs) };
}
