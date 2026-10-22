export interface Item {
  id: number;
  name: string;
  description: string;
  type: 'CONSUMABLE' | 'WEAPON' | 'ARMOR';
  price: number;
  damage: number;
  armor: number;
  bonusStr: number;
  bonusDex: number;
  bonusInt: number;
  healHp: number;
  restoreEnergy: number;
}

export interface PlayerView {
  id: number;
  name: string;
  level: number;
  exp: number;
  expToNext: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  gold: number;
  baseStats: { strength: number; dexterity: number; intelligence: number };
  stats: {
    strength: number;
    dexterity: number;
    intelligence: number;
    damage: number;
    armor: number;
  };
  location: { id: number; name: string };
  inCombat: boolean;
}

export interface Npc {
  id: number;
  name: string;
  description: string;
  type: 'MONSTER' | 'FRIENDLY' | 'MERCHANT';
  level: number;
}

export interface LocationView {
  id: number;
  name: string;
  description: string;
  hasInn: boolean;
  npcs: Npc[];
  exits: { locationId: number; name: string; minLevel: number; accessible: boolean }[];
  actions: { type: string; label: string }[];
}

export interface CombatView {
  id: number;
  status: 'ACTIVE' | 'WON' | 'LOST' | 'FLED';
  round: number;
  enemy: { id: number; name: string; level: number; hp: number; maxHp: number };
  player: { hp: number; maxHp: number };
  messages: string[];
}

export interface InventoryEntry {
  itemId: number;
  quantity: number;
  equipped: boolean;
  item: Item;
}

export interface QuestView {
  id: number;
  title: string;
  description: string;
  minLevel: number;
  status: 'AVAILABLE' | 'ACTIVE' | 'COMPLETED';
  progress: number;
  targetCount: number;
  ready: boolean;
  targetNpc: { id: number; name: string };
  giverLocation: { id: number; name: string } | null;
  rewards: { exp: number; gold: number; item: { id: number; name: string } | null };
}

export interface ShopView {
  gold: number;
  merchants: { id: number; name: string; goods: { item: Item; buyPrice: number }[] }[];
  sellable: { item: Item; quantity: number; equipped: boolean; sellPrice: number }[];
}

export interface LogEntry {
  id: number;
  message: string;
  createdAt: string;
}
