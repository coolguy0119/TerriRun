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
const KAKAO_JS_KEY = '4faa438965e9eb55fd22ed19765f39d1';
const KAKAO_REST_KEY = '1ad4867861562a94fce7f566e012db0f';

async function loadKakaoSDK() {
  if (window.Kakao && window.Kakao.isInitialized()) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
    s.crossOrigin = 'anonymous';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  window.Kakao.init(KAKAO_JS_KEY);
}

export async function signInWithKakao() {
  if (Platform.OS === 'web') {
    // 팝업 대신 전체 페이지 리다이렉트 사용 (팝업 차단 없음)
    const redirectUri = window.location.origin;
    window.location.href =
      `https://kauth.kakao.com/oauth/authorize` +
      `?client_id=${KAKAO_REST_KEY}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code`;
    return new Promise(() => {}); // 페이지 이동 후 앱이 재시작됨
  } else {
    const { makeRedirectUri } = await import('expo-auth-session');
    const redirectUri = makeRedirectUri({ useProxy: true });
    const authUrl =
      `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_KEY}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    const { WebBrowser } = await import('expo-web-browser');
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    if (result.type === 'success') {
      const code = new URL(result.url).searchParams.get('code');
      return await exchangeKakaoCode(code);
    }
    throw new Error('카카오 로그인이 취소되었습니다.');
  }
}

async function createFirebaseUserFromKakao(kakaoUser) {
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

async function exchangeKakaoCode(code, redirectUri) {
  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KAKAO_REST_KEY,
      redirect_uri: redirectUri,
      code,
    }).toString(),
  });
  const tokens = await res.json();
  const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const kakaoUser = await userRes.json();
  return await createFirebaseUserFromKakao(kakaoUser);
}

// 카카오 리다이렉트 후 URL에서 code 감지하여 로그인 완료
export async function handleKakaoRedirect() {
  if (Platform.OS !== 'web') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return null;
  // URL 정리 (뒤로가기 시 재실행 방지)
  window.history.replaceState({}, document.title, window.location.pathname);
  const redirectUri = window.location.origin;
  return await exchangeKakaoCode(code, redirectUri);
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
