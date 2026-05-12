import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, saveAuth, clearAuth, getPlayer, savePlayer } from '../utils/storage';
import { logoutFromKakao } from '../services/kakaoAuthService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(undefined); // undefined = 초기 로딩 중

  useEffect(() => {
    getAuth().then(setAuth);
  }, []);

  async function login(authData) {
    await saveAuth(authData);
    // 카카오 닉네임으로 플레이어 이름 동기화
    if (!authData.isGuest && authData.nickname) {
      const player = await getPlayer();
      await savePlayer({ ...player, name: authData.nickname, kakaoId: authData.userId });
    }
    setAuth(authData);
  }

  async function logout() {
    if (auth?.accessToken && !auth.isGuest) {
      await logoutFromKakao(auth.accessToken);
    }
    await clearAuth();
    setAuth(null);
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout, isLoading: auth === undefined }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
