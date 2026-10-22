import { useState } from 'react';
import { getToken, setToken } from './api';
import AuthScreen from './components/AuthScreen';
import Game from './components/Game';

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());

  const logout = () => {
    setToken(null);
    setAuthed(false);
  };

  return authed ? (
    <Game onLogout={logout} />
  ) : (
    <AuthScreen
      onAuth={(token) => {
        setToken(token);
        setAuthed(true);
      }}
    />
  );
}
