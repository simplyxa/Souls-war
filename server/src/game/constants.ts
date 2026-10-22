export const ENERGY_COST_MOVE = 1;
export const ENERGY_COST_FIGHT = 2;
export const ENERGY_REGEN_MS = 60_000; // +1 energy per minute
export const INN_PRICE = 10;
export const SELL_RATIO = 0.5;
export const DEFEAT_GOLD_LOSS = 0.1;
export const MAX_LOG_ENTRIES = 100;

/** Items (by unique name) granted to every new character. Missing items are skipped. */
export const STARTER_ITEMS = [
  { name: 'Ржавый меч', quantity: 1, equip: true },
  { name: 'Малое зелье лечения', quantity: 2, equip: false },
];
