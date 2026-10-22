import { FormEvent, useState } from 'react';
import { api } from '../api';

export default function AuthScreen({ onAuth }: { onAuth: (token: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body =
        mode === 'login'
          ? { username, password }
          : { username, password, ...(characterName ? { characterName } : {}) };
      const res = await api<{ accessToken: string }>(`/auth/${mode}`, 'POST', body);
      onAuth(res.accessToken);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <form className="panel" onSubmit={submit}>
        <h1>⚔ Souls War</h1>
        <p className="muted">Текстовая RPG</p>
        <label>
          Логин
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {mode === 'register' && (
          <label>
            Имя персонажа (необязательно)
            <input value={characterName} onChange={(e) => setCharacterName(e.target.value)} />
          </label>
        )}
        {error && <div className="error">{error}</div>}
        <button disabled={busy}>{mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
        </button>
        <p className="muted">Демо: hero1 / password123, admin / admin123</p>
      </form>
    </div>
  );
}
