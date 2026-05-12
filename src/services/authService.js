import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { Platform } from 'react-native';
import { auth } from './firebase';

// ── Google ─────────────────────────────────────────────────────
export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    const { signInWithPopup } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } else {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    await GoogleSignin.hasPlayServices();
    const { idToken } = await GoogleSignin.signIn();
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    return result.user;
  }
}

// ── Kakao ──────────────────────────────────────────────────────
export async function signInWithKakao() {
  const { makeRedirectUri, useAuthRequest } = await import('expo-auth-session');
  const redirectUri = makeRedirectUri({ useProxy: true });
  const authUrl =
    `https://kauth.kakao.com/oauth/authorize?client_id=227174d875bd067682004a57dcc6599d` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

  if (Platform.OS === 'web') {
    const popup = window.open(authUrl, '_blank', 'width=500,height=600');
    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          reject(new Error('카카오 로그인이 취소되었습니다.'));
        }
      }, 500);
    });
  } else {
    const { WebBrowser } = await import('expo-web-browser');
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    if (result.type === 'success') {
      const code = new URL(result.url).searchParams.get('code');
      return await exchangeKakaoCode(code);
    }
    throw new Error('카카오 로그인이 취소되었습니다.');
  }
}

async function exchangeKakaoCode(code) {
  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: '227174d875bd067682004a57dcc6599d',
      code,
    }).toString(),
  });
  const tokens = await res.json();
  const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const kakaoUser = await userRes.json();
  const email = kakaoUser.kakao_account?.email || `kakao_${kakaoUser.id}@terrarun.app`;
  const name = kakaoUser.kakao_account?.profile?.nickname || '카카오 유저';

  try {
    const result = await signInWithEmailAndPassword(auth, email, `kakao_${kakaoUser.id}`);
    return result.user;
  } catch {
    const result = await createUserWithEmailAndPassword(auth, email, `kakao_${kakaoUser.id}`);
    await updateProfile(result.user, { displayName: name });
    return result.user;
  }
}

// ── Naver ──────────────────────────────────────────────────────
export async function signInWithNaver(clientId) {
  const state = Math.random().toString(36).substring(7);
  const { makeRedirectUri } = await import('expo-auth-session');
  const redirectUri = makeRedirectUri({ useProxy: true });
  const authUrl =
    `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  const { WebBrowser } = await import('expo-web-browser');
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type !== 'success') throw new Error('네이버 로그인이 취소되었습니다.');
  const params = new URL(result.url).searchParams;
  return { code: params.get('code'), state: params.get('state') };
}

// ── Email ──────────────────────────────────────────────────────
export async function signInWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signUpWithEmail(email, password, name) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });
  return result.user;
}

// ── Logout ─────────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
}

// ── Auth state ─────────────────────────────────────────────────
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
