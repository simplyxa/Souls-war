import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';

/**
 * End-to-end smoke test. Needs a migrated and seeded database:
 *   DATABASE_URL=... E2E=1 npx jest test
 */
const run = process.env.E2E ? describe : describe.skip;
const SCHEME = 'Bear' + 'er ';

run('game flow (e2e)', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();
  const username = `e2e_${Date.now()}`;
  let auth: [string, string];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(() => app.close());

  const login = async (u: string, p: string): Promise<[string, string]> => {
    const res = await request(server())
      .post('/api/auth/login')
      .send({ username: u, password: p })
      .expect(200);
    return ['Authorization', SCHEME + res.body.accessToken];
  };
  const get = (url: string, a = auth) =>
    request(server())
      .get(url)
      .set(...a);
  const post = (url: string, body: object = {}, a = auth) =>
    request(server())
      .post(url)
      .set(...a)
      .send(body);

  it('requires authentication', () => request(server()).get('/api/players/me').expect(401));

  it('registers and creates a character with starter gear', async () => {
    const creds = { username, password: 'secret123' };
    await request(server()).post('/api/auth/register').send(creds).expect(201);
    await request(server()).post('/api/auth/register').send(creds).expect(409);
    auth = await login(username, 'secret123');
    const me = await get('/api/players/me').expect(200);
    expect(me.body).toMatchObject({ level: 1, hp: 40, gold: 50, inCombat: false });
    const inv = await get('/api/inventory').expect(200);
    expect(inv.body.length).toBeGreaterThanOrEqual(2);
  });

  it('validates movement', async () => {
    const loc = await get('/api/world/location').expect(200);
    expect(loc.body.exits.length).toBeGreaterThan(0);
    await post('/api/world/move', { locationId: 99999 }).expect(400);
    await post('/api/world/move', { locationId: loc.body.exits[0].locationId }).expect(200);
    await post('/api/world/move', { locationId: loc.body.id }).expect(200);
  });

  it('shop, quest and combat flow', async () => {
    const shop = await get('/api/shop').expect(200);
    const potion = shop.body.merchants[0].goods.find(
      (g: any) => g.item.name === 'Малое зелье лечения',
    );
    await post('/api/shop/buy', { itemId: potion.item.id, quantity: 1 }).expect(200);
    await post('/api/shop/sell', { itemId: potion.item.id, quantity: 1 }).expect(200);
    await post('/api/shop/buy', { itemId: potion.item.id, quantity: 99 }).expect(400);
    await post('/api/inventory/use', { itemId: 99999 }).expect(400);

    const quests = await get('/api/quests').expect(200);
    const quest = quests.body.find((q: any) => q.status === 'AVAILABLE');
    await post(`/api/quests/${quest.id}/accept`).expect(200);
    await post(`/api/quests/${quest.id}/complete`).expect(400);

    const loc = await get('/api/world/location');
    const target = loc.body.npcs.find((n: any) => n.id === quest.targetNpc.id);
    for (let i = 0; i < quest.targetCount; i++) {
      await post('/api/combat/start', { npcId: target.id }).expect(200);
      await post('/api/world/rest').expect(400); // blocked while in combat
      for (let r = 0; r < 20; r++) {
        const res = await post('/api/combat/action', { action: 'ATTACK' }).expect(200);
        if (res.body.combat.status !== 'ACTIVE') break;
      }
    }
    const done = await post(`/api/quests/${quest.id}/complete`).expect(200);
    expect(done.body.messages.length).toBeGreaterThan(0);
    const logs = await get('/api/logs').expect(200);
    expect(logs.body.length).toBeGreaterThan(5);
  });

  it('protects admin endpoints and supports CRUD', async () => {
    await get('/api/admin/items').expect(403);
    const admin = await login('admin', 'admin123');
    const name = `Тестовый предмет ${Date.now()}`;
    const created = await post(
      '/api/admin/items',
      { name, type: 'WEAPON', damage: 1 },
      admin,
    ).expect(201);
    await request(server())
      .patch(`/api/admin/items/${created.body.id}`)
      .set(...admin)
      .send({ price: 5 })
      .expect(200);
    await post('/api/admin/items', { name, type: 'BAD' }, admin).expect(400);
    await request(server())
      .delete(`/api/admin/items/${created.body.id}`)
      .set(...admin)
      .expect(204);
    await get(`/api/admin/items/${created.body.id}`, admin).expect(404);
  });
});
