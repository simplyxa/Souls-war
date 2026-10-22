import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api';
import type {
  CombatView,
  InventoryEntry,
  LocationView,
  LogEntry,
  PlayerView,
  QuestView,
  ShopView,
} from '../types';

const bar = (value: number, max: number) => `${Math.max(0, Math.min(100, (value / max) * 100))}%`;

function Bar({
  label,
  value,
  max,
  kind,
}: {
  label: string;
  value: number;
  max: number;
  kind: string;
}) {
  return (
    <div className="bar-row">
      <span>
        {label}: {value}/{max}
      </span>
      <div className="bar">
        <div className={`fill ${kind}`} style={{ width: bar(value, max) }} />
      </div>
    </div>
  );
}

export default function Game({ onLogout }: { onLogout: () => void }) {
  const [player, setPlayer] = useState<PlayerView | null>(null);
  const [location, setLocation] = useState<LocationView | null>(null);
  const [combat, setCombat] = useState<CombatView | null>(null);
  const [lastCombat, setLastCombat] = useState<CombatView | null>(null);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [quests, setQuests] = useState<QuestView[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [shop, setShop] = useState<ShopView | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [p, l, c, i, q, lg] = await Promise.all([
        api<PlayerView>('/players/me'),
        api<LocationView>('/world/location'),
        api<{ combat: CombatView | null }>('/combat'),
        api<InventoryEntry[]>('/inventory'),
        api<QuestView[]>('/quests'),
        api<LogEntry[]>('/logs?limit=50'),
      ]);
      setPlayer(p);
      setLocation(l);
      setCombat(c.combat);
      setInventory(i);
      setQuests(q);
      setLogs(lg);
      setShop(l.actions.some((a) => a.type === 'TRADE') ? await api<ShopView>('/shop') : null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onLogout();
      else setError((e as Error).message);
    }
  }, [onLogout]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Runs an API call, shows errors and refreshes the whole state afterwards. */
  const act = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setError('');
    try {
      const res = await fn();
      await refresh();
      return res;
    } catch (e) {
      setError((e as Error).message);
      await refresh();
    }
  };

  const post = (path: string, body?: unknown) => act(() => api(path, 'POST', body ?? {}));

  const combatAction = async (action: string, itemId?: number) => {
    const res = await act(() =>
      api<{ combat: CombatView }>('/combat/action', 'POST', { action, itemId }),
    );
    if (res && res.combat.status !== 'ACTIVE') setLastCombat(res.combat);
  };

  if (!player || !location) {
    return (
      <div className="center">{error ? <div className="error">{error}</div> : 'Загрузка…'}</div>
    );
  }

  const potions = inventory.filter((e) => e.item.type === 'CONSUMABLE');

  return (
    <div className="game">
      <header>
        <h1>⚔ Souls War</h1>
        <button onClick={onLogout}>Выйти</button>
      </header>
      {error && <div className="error">{error}</div>}

      <div className="grid">
        <section className="panel">
          <h2>{player.name}</h2>
          <p>
            Уровень {player.level} · Опыт {player.exp}/{player.expToNext}
          </p>
          <Bar label="HP" value={player.hp} max={player.maxHp} kind="hp" />
          <Bar label="Энергия" value={player.energy} max={player.maxEnergy} kind="energy" />
          <p>💰 Золото: {player.gold}</p>
          <ul className="stats">
            <li>Сила: {player.stats.strength}</li>
            <li>Ловкость: {player.stats.dexterity}</li>
            <li>Интеллект: {player.stats.intelligence}</li>
            <li>Урон оружия: +{player.stats.damage}</li>
            <li>Броня: {player.stats.armor}</li>
          </ul>
        </section>

        <section className="panel">
          <h2>📍 {location.name}</h2>
          <p>{location.description}</p>
          {combat ? (
            <div className="combat">
              <h3>
                ⚔ Бой: {combat.enemy.name} (ур. {combat.enemy.level}), раунд {combat.round}
              </h3>
              <Bar label="Враг" value={combat.enemy.hp} max={combat.enemy.maxHp} kind="enemy" />
              <div className="buttons">
                <button onClick={() => combatAction('ATTACK')}>Атака</button>
                <button onClick={() => combatAction('DEFEND')}>Защита</button>
                <button onClick={() => combatAction('FLEE')}>Побег</button>
              </div>
              {potions.length > 0 && (
                <div className="buttons">
                  {potions.map((e) => (
                    <button key={e.itemId} onClick={() => combatAction('USE_ITEM', e.itemId)}>
                      {e.item.name} ×{e.quantity}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {lastCombat && (
                <div className={`result ${lastCombat.status.toLowerCase()}`}>
                  Последний бой:{' '}
                  {
                    { WON: 'победа', LOST: 'поражение', FLED: 'побег', ACTIVE: '' }[
                      lastCombat.status
                    ]
                  }
                </div>
              )}
              <h3>Персонажи</h3>
              <ul>
                {location.npcs.map((n) => (
                  <li key={n.id}>
                    <b>{n.name}</b> (
                    {n.type === 'MONSTER'
                      ? `враг, ур. ${n.level}`
                      : n.type === 'MERCHANT'
                        ? 'торговец'
                        : 'житель'}
                    )<span className="muted"> — {n.description}</span>
                    {n.type === 'MONSTER' && (
                      <button onClick={() => post('/combat/start', { npcId: n.id })}>
                        Напасть
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <h3>Переходы</h3>
              <div className="buttons">
                {location.exits.map((x) => (
                  <button
                    key={x.locationId}
                    disabled={!x.accessible}
                    title={x.accessible ? '' : `Нужен уровень ${x.minLevel}`}
                    onClick={() => post('/world/move', { locationId: x.locationId })}
                  >
                    {x.name}
                    {!x.accessible && ` (ур. ${x.minLevel}+)`}
                  </button>
                ))}
                {location.hasInn && (
                  <button onClick={() => post('/world/rest')}>Отдохнуть (10 з.)</button>
                )}
              </div>
            </>
          )}
        </section>

        <section className="panel">
          <h2>🎒 Инвентарь</h2>
          {inventory.length === 0 && <p className="muted">Пусто</p>}
          <ul>
            {inventory.map((e) => (
              <li key={e.itemId}>
                <b>{e.item.name}</b> ×{e.quantity} {e.equipped && <em>(надето)</em>}
                <div className="muted">{e.item.description}</div>
                {!combat && e.item.type === 'CONSUMABLE' && (
                  <button onClick={() => post('/inventory/use', { itemId: e.itemId })}>
                    Использовать
                  </button>
                )}
                {!combat && e.item.type !== 'CONSUMABLE' && (
                  <button
                    onClick={() =>
                      post(e.equipped ? '/inventory/unequip' : '/inventory/equip', {
                        itemId: e.itemId,
                      })
                    }
                  >
                    {e.equipped ? 'Снять' : 'Надеть'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>📜 Квесты</h2>
          {quests.length === 0 && <p className="muted">Нет доступных заданий</p>}
          <ul>
            {quests.map((q) => (
              <li key={q.id}>
                <b>{q.title}</b>{' '}
                <span className={`tag ${q.status.toLowerCase()}`}>
                  {{ AVAILABLE: 'доступен', ACTIVE: 'активен', COMPLETED: 'выполнен' }[q.status]}
                </span>
                <div className="muted">{q.description}</div>
                <div>
                  Цель: {q.targetNpc.name} — {q.progress}/{q.targetCount} · Награда: {q.rewards.exp}{' '}
                  опыта, {q.rewards.gold} з.
                  {q.rewards.item && `, ${q.rewards.item.name}`}
                </div>
                {q.status === 'AVAILABLE' && (
                  <button
                    disabled={!!q.giverLocation && q.giverLocation.id !== location.id}
                    title={q.giverLocation ? `Взять: ${q.giverLocation.name}` : ''}
                    onClick={() => post(`/quests/${q.id}/accept`)}
                  >
                    Взять
                    {q.giverLocation && q.giverLocation.id !== location.id
                      ? ` (${q.giverLocation.name})`
                      : ''}
                  </button>
                )}
                {q.ready && <button onClick={() => post(`/quests/${q.id}/complete`)}>Сдать</button>}
              </li>
            ))}
          </ul>
        </section>

        {shop && !combat && (
          <section className="panel">
            <h2>🛒 Магазин</h2>
            {shop.merchants.map((m) => (
              <div key={m.id}>
                <h3>{m.name}</h3>
                <ul>
                  {m.goods.map((g) => (
                    <li key={g.item.id}>
                      {g.item.name} — {g.buyPrice} з.
                      <span className="muted"> {g.item.description}</span>
                      <button
                        disabled={player.gold < g.buyPrice}
                        onClick={() => post('/shop/buy', { itemId: g.item.id, quantity: 1 })}
                      >
                        Купить
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <h3>Продать</h3>
            <ul>
              {shop.sellable
                .filter((s) => s.sellPrice > 0)
                .map((s) => (
                  <li key={s.item.id}>
                    {s.item.name} ×{s.quantity} — {s.sellPrice} з.
                    <button
                      disabled={s.equipped && s.quantity === 1}
                      onClick={() => post('/shop/sell', { itemId: s.item.id, quantity: 1 })}
                    >
                      Продать
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <section className="panel log">
          <h2>📖 События</h2>
          <ul>
            {logs.map((l) => (
              <li key={l.id}>
                <span className="muted">{new Date(l.createdAt).toLocaleTimeString()}</span>{' '}
                {l.message}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
