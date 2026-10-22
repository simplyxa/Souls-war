import { ItemType, NpcType, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const locations = [
  {
    name: 'Деревня Рассвет',
    hasInn: true,
    description:
      'Тихая деревушка на краю мира. Здесь живут старосты, торговцы и те, кому не страшна ночь. На площади пахнет свежим хлебом и железом.',
  },
  {
    name: 'Тёмный лес',
    hasInn: false,
    description:
      'Густой лес, где даже днём царит полумрак. Между корнями шныряют волки и гоблины-разведчики.',
  },
  {
    name: 'Форт Пепла',
    hasInn: true,
    description:
      'Покосившаяся крепость на лесной опушке. Здесь отдыхают наёмники и работает кузнец Горн.',
  },
  {
    name: 'Заброшенная шахта',
    hasInn: false,
    description: 'Давно покинутые штольни. В темноте слышен стук костей и шорох паучьих лап.',
  },
  {
    name: 'Руины Цитадели',
    hasInn: false,
    description:
      'Некогда великая цитадель, ныне — проклятые руины, охраняемые тёмными рыцарями и призраками.',
  },
  {
    name: 'Пещера Дракона',
    hasInn: false,
    description: 'Жаркая пещера, усыпанная костями героев. В глубине дремлет древний дракон.',
  },
];

// [from, to, minLevel] — links are created in both directions
const links: [string, string, number][] = [
  ['Деревня Рассвет', 'Тёмный лес', 1],
  ['Тёмный лес', 'Форт Пепла', 1],
  ['Тёмный лес', 'Заброшенная шахта', 2],
  ['Заброшенная шахта', 'Руины Цитадели', 3],
  ['Руины Цитадели', 'Пещера Дракона', 5],
];

const items = [
  {
    name: 'Ржавый меч',
    type: ItemType.WEAPON,
    price: 10,
    damage: 2,
    description: 'Старый, но всё ещё острый.',
  },
  {
    name: 'Железный меч',
    type: ItemType.WEAPON,
    price: 60,
    damage: 5,
    description: 'Надёжный клинок наёмника.',
  },
  {
    name: 'Стальной клинок',
    type: ItemType.WEAPON,
    price: 200,
    damage: 9,
    bonusStr: 1,
    description: 'Закалённая сталь, лёгкая в руке.',
  },
  {
    name: 'Посох ученика',
    type: ItemType.WEAPON,
    price: 80,
    damage: 3,
    bonusInt: 3,
    description: 'Усиливает магические способности.',
  },
  {
    name: 'Драконий клинок',
    type: ItemType.WEAPON,
    price: 900,
    damage: 15,
    bonusStr: 3,
    bonusDex: 1,
    description: 'Клинок, выкованный из клыка дракона.',
  },
  {
    name: 'Кожаная куртка',
    type: ItemType.ARMOR,
    price: 40,
    armor: 2,
    description: 'Лёгкая защита для путешественника.',
  },
  {
    name: 'Кольчуга',
    type: ItemType.ARMOR,
    price: 150,
    armor: 5,
    description: 'Звенящие кольца защитят от клыков.',
  },
  {
    name: 'Латный доспех',
    type: ItemType.ARMOR,
    price: 400,
    armor: 9,
    bonusStr: 1,
    description: 'Тяжёлый доспех рыцаря.',
  },
  {
    name: 'Малое зелье лечения',
    type: ItemType.CONSUMABLE,
    price: 15,
    healHp: 25,
    description: 'Восстанавливает 25 HP.',
  },
  {
    name: 'Большое зелье лечения',
    type: ItemType.CONSUMABLE,
    price: 40,
    healHp: 60,
    description: 'Восстанавливает 60 HP.',
  },
  {
    name: 'Зелье энергии',
    type: ItemType.CONSUMABLE,
    price: 20,
    restoreEnergy: 10,
    description: 'Восстанавливает 10 энергии.',
  },
];

const npcs = [
  {
    name: 'Староста Ольгер',
    type: NpcType.FRIENDLY,
    location: 'Деревня Рассвет',
    description: 'Мудрый старик, раздающий задания.',
  },
  {
    name: 'Торговец Борис',
    type: NpcType.MERCHANT,
    location: 'Деревня Рассвет',
    description: 'Продаёт зелья и простую экипировку.',
    shop: [
      'Ржавый меч',
      'Кожаная куртка',
      'Малое зелье лечения',
      'Большое зелье лечения',
      'Зелье энергии',
    ],
  },
  {
    name: 'Амбарная крыса',
    type: NpcType.MONSTER,
    location: 'Деревня Рассвет',
    description: 'Огромная крыса, грызущая запасы.',
    level: 1,
    maxHp: 14,
    attack: 3,
    defense: 0,
    agility: 2,
    expReward: 12,
    goldReward: 3,
    drop: 'Малое зелье лечения',
    dropChance: 0.15,
  },
  {
    name: 'Серый волк',
    type: NpcType.MONSTER,
    location: 'Тёмный лес',
    description: 'Голодный хищник.',
    level: 2,
    maxHp: 28,
    attack: 6,
    defense: 1,
    agility: 5,
    expReward: 25,
    goldReward: 8,
    drop: 'Малое зелье лечения',
    dropChance: 0.2,
  },
  {
    name: 'Гоблин-разведчик',
    type: NpcType.MONSTER,
    location: 'Тёмный лес',
    description: 'Хитрый зеленокожий воришка.',
    level: 2,
    maxHp: 32,
    attack: 7,
    defense: 1,
    agility: 4,
    expReward: 30,
    goldReward: 14,
    drop: 'Железный меч',
    dropChance: 0.08,
  },
  {
    name: 'Кузнец Горн',
    type: NpcType.MERCHANT,
    location: 'Форт Пепла',
    description: 'Ковёт лучшее оружие в округе.',
    shop: [
      'Железный меч',
      'Стальной клинок',
      'Посох ученика',
      'Кольчуга',
      'Латный доспех',
      'Большое зелье лечения',
    ],
  },
  {
    name: 'Скелет-шахтёр',
    type: NpcType.MONSTER,
    location: 'Заброшенная шахта',
    description: 'Всё ещё держит кирку.',
    level: 3,
    maxHp: 50,
    attack: 10,
    defense: 3,
    agility: 4,
    expReward: 55,
    goldReward: 18,
    drop: 'Кольчуга',
    dropChance: 0.07,
  },
  {
    name: 'Гигантский паук',
    type: NpcType.MONSTER,
    location: 'Заброшенная шахта',
    description: 'Ядовитый и быстрый.',
    level: 3,
    maxHp: 45,
    attack: 12,
    defense: 2,
    agility: 8,
    expReward: 60,
    goldReward: 20,
    drop: 'Зелье энергии',
    dropChance: 0.25,
  },
  {
    name: 'Тёмный рыцарь',
    type: NpcType.MONSTER,
    location: 'Руины Цитадели',
    description: 'Страж проклятых руин.',
    level: 5,
    maxHp: 90,
    attack: 18,
    defense: 7,
    agility: 6,
    expReward: 120,
    goldReward: 45,
    drop: 'Стальной клинок',
    dropChance: 0.2,
  },
  {
    name: 'Призрак',
    type: NpcType.MONSTER,
    location: 'Руины Цитадели',
    description: 'Бестелесный дух, проклявший цитадель.',
    level: 5,
    maxHp: 70,
    attack: 16,
    defense: 4,
    agility: 12,
    expReward: 110,
    goldReward: 40,
    drop: 'Большое зелье лечения',
    dropChance: 0.3,
  },
  {
    name: 'Малый дракон',
    type: NpcType.MONSTER,
    location: 'Пещера Дракона',
    description: 'Юный, но смертельно опасный дракон.',
    level: 8,
    maxHp: 220,
    attack: 30,
    defense: 10,
    agility: 9,
    expReward: 500,
    goldReward: 300,
    drop: 'Драконий клинок',
    dropChance: 0.5,
  },
];

const quests = [
  {
    title: 'Крысиная напасть',
    description: 'Староста просит избавить амбары от крыс. Убейте 3 амбарные крысы.',
    location: 'Деревня Рассвет',
    target: 'Амбарная крыса',
    count: 3,
    minLevel: 1,
    exp: 40,
    gold: 30,
    item: 'Малое зелье лечения',
  },
  {
    title: 'Волчья угроза',
    description: 'Волки нападают на путников в Тёмном лесу. Убейте 3 серых волков.',
    location: 'Деревня Рассвет',
    target: 'Серый волк',
    count: 3,
    minLevel: 1,
    prereq: 'Крысиная напасть',
    exp: 100,
    gold: 60,
    item: 'Кожаная куртка',
  },
  {
    title: 'Тайна шахты',
    description: 'Кузнец Горн потерял связь с шахтёрами. Уничтожьте 4 скелетов-шахтёров.',
    location: 'Форт Пепла',
    target: 'Скелет-шахтёр',
    count: 4,
    minLevel: 2,
    prereq: 'Волчья угроза',
    exp: 200,
    gold: 120,
    item: 'Железный меч',
  },
  {
    title: 'Убийца дракона',
    description: 'Легенда гласит, что дракон в пещере охраняет несметные сокровища. Победите его.',
    location: 'Деревня Рассвет',
    target: 'Малый дракон',
    count: 1,
    minLevel: 5,
    prereq: 'Тайна шахты',
    exp: 600,
    gold: 500,
    item: 'Латный доспех',
  },
];

async function main() {
  const loc: Record<string, number> = {};
  for (const l of locations) {
    loc[l.name] = (
      await prisma.location.upsert({ where: { name: l.name }, create: l, update: l })
    ).id;
  }
  for (const [a, b, minLevel] of links) {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ]) {
      // returning to a lower-level area is always allowed; only the way "deeper" is gated
      const gate = from === a ? minLevel : 1;
      await prisma.locationLink.upsert({
        where: { fromId_toId: { fromId: loc[from], toId: loc[to] } },
        create: { fromId: loc[from], toId: loc[to], minLevel: gate },
        update: { minLevel: gate },
      });
    }
  }

  const item: Record<string, number> = {};
  for (const i of items) {
    item[i.name] = (await prisma.item.upsert({ where: { name: i.name }, create: i, update: i })).id;
  }

  const npc: Record<string, number> = {};
  for (const n of npcs) {
    const data = {
      name: n.name,
      type: n.type,
      description: n.description,
      locationId: loc[n.location],
      level: n.level ?? 1,
      maxHp: n.maxHp ?? 20,
      attack: n.attack ?? 0,
      defense: n.defense ?? 0,
      agility: n.agility ?? 1,
      expReward: n.expReward ?? 0,
      goldReward: n.goldReward ?? 0,
      dropItemId: n.drop ? item[n.drop] : null,
      dropChance: n.dropChance ?? 0,
    };
    const row = await prisma.npc.upsert({ where: { name: n.name }, create: data, update: data });
    npc[n.name] = row.id;
    for (const goods of n.shop ?? []) {
      await prisma.shopEntry.upsert({
        where: { npcId_itemId: { npcId: row.id, itemId: item[goods] } },
        create: { npcId: row.id, itemId: item[goods] },
        update: {},
      });
    }
  }

  const quest: Record<string, number> = {};
  for (const q of quests) {
    const data = {
      title: q.title,
      description: q.description,
      minLevel: q.minLevel,
      giverLocationId: loc[q.location],
      targetNpcId: npc[q.target],
      targetCount: q.count,
      rewardExp: q.exp,
      rewardGold: q.gold,
      rewardItemId: item[q.item],
      prerequisiteId: q.prereq ? quest[q.prereq] : null,
    };
    quest[q.title] = (
      await prisma.quest.upsert({ where: { title: q.title }, create: data, update: data })
    ).id;
  }

  // Demo accounts (created once; existing progress is never overwritten)
  const accounts = [
    {
      username: 'admin',
      password: 'admin123',
      role: Role.ADMIN,
      name: 'Администратор',
      level: 10,
      gold: 1000,
    },
    {
      username: 'hero1',
      password: 'password123',
      role: Role.PLAYER,
      name: 'Артур',
      level: 1,
      gold: 100,
    },
    {
      username: 'hero2',
      password: 'password123',
      role: Role.PLAYER,
      name: 'Мерлин',
      level: 3,
      gold: 250,
    },
  ];
  const seedDemo = process.env.SEED_DEMO !== 'false';
  for (const a of seedDemo ? accounts : []) {
    if (await prisma.user.findUnique({ where: { username: a.username } })) continue;
    const bonus = a.level - 1;
    const user = await prisma.user.create({
      data: {
        username: a.username,
        role: a.role,
        passwordHash: await bcrypt.hash(a.password, 10),
        player: {
          create: {
            name: a.name,
            level: a.level,
            gold: a.gold,
            locationId: loc['Деревня Рассвет'],
            maxHp: 40 + 8 * bonus,
            hp: 40 + 8 * bonus,
            maxEnergy: 20 + 2 * bonus,
            energy: 20 + 2 * bonus,
            strength: 5 + bonus,
            dexterity: 5 + bonus,
            intelligence: 5 + bonus,
          },
        },
      },
      include: { player: true },
    });
    const starter: [string, number, boolean][] = [
      ['Ржавый меч', 1, true],
      ['Малое зелье лечения', 2, false],
    ];
    if (a.level >= 3) starter.push(['Кожаная куртка', 1, true]);
    for (const [name, quantity, equipped] of starter) {
      await prisma.inventoryItem.create({
        data: { playerId: user.player!.id, itemId: item[name], quantity, equipped },
      });
    }
    await prisma.actionLog.create({
      data: { playerId: user.player!.id, message: `Добро пожаловать в Souls War, ${a.name}!` },
    });
  }
  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
