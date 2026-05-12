import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

// ── 설정 방법 ──────────────────────────────────────────────────
// 1. https://developers.kakao.com 에서 앱 생성
// 2. [플랫폼] → iOS/Android 앱 등록
// 3. REST API 키를 아래에 입력
// 4. [카카오 로그인] 활성화
// 5. Redirect URI 등록:
//    - 개발(Expo Go): makeRedirectUri()가 반환하는 주소 (콘솔 로그 확인)
//    - 배포(EAS Build): terrarun://auth/kakao
export const KAKAO_REST_API_KEY = '1ad4867861562a94fce7f566e012db0f';

const KAKAO_AUTH_URL  = 'https://kauth.kakao.com/oauth/authorize';
const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USER_URL  = 'https://kapi.kakao.com/v2/user/me';
const KAKAO_LOGOUT_URL = 'https://kapi.kakao.com/v1/user/logout';

export function getRedirectUri() {
  return AuthSession.makeRedirectUri({ scheme: 'terrarun', path: 'auth/kakao' });
}

function parseUrlParams(url) {
  const query = (url.split('?')[1] ?? '').split('#')[0];
  const params = {};
  query.split('&').forEach((part) => {
    const eq = part.indexOf('=');
    if (eq > 0) {
      params[decodeURIComponent(part.slice(0, eq))] = decodeURIComponent(part.slice(eq + 1));
    }
  });
  return params;
}

export async function loginWithKakao() {
  if (!KAKAO_REST_API_KEY) {
    throw new Error('KAKAO_REST_API_KEY를 src/services/kakaoAuthService.js에 입력해주세요.');
  }

  const redirectUri = getRedirectUri();
  console.log('[Kakao] redirectUri:', redirectUri); // 개발자 콘솔에 등록할 주소

  const authUrl =
    `${KAKAO_AUTH_URL}?response_type=code` +
    `&client_id=${encodeURIComponent(KAKAO_REST_API_KEY)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== 'success' || !result.url) return null; // 취소

  const params = parseUrlParams(result.url);
  const code = params['code'];
  if (!code) throw new Error('인증 코드를 받지 못했습니다. Redirect URI를 확인해주세요.');

  // 코드 → 토큰 교환
  const tokenRes = await fetch(KAKAO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body:
      `grant_type=authorization_code` +
      `&client_id=${encodeURIComponent(KAKAO_REST_API_KEY)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${encodeURIComponent(code)}`,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`토큰 교환 실패: ${err}`);
  }
  const tokenData = await tokenRes.json();

  // 사용자 정보 조회
  const userInfo = await fetchKakaoUserInfo(tokenData.access_token);

  return {
    accessToken:  tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn:    tokenData.expires_in,
    userId:       String(userInfo.id),
    nickname:     userInfo.kakao_account?.profile?.nickname ?? '카카오 사용자',
    profileImage: userInfo.kakao_account?.profile?.profile_image_url ?? null,
    email:        userInfo.kakao_account?.email ?? null,
    isGuest:      false,
    loggedInAt:   Date.now(),
  };
}

export async function fetchKakaoUserInfo(accessToken) {
  const res = await fetch(KAKAO_USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('프로필 조회 실패');
  return res.json();
}

export async function logoutFromKakao(accessToken) {
  if (!accessToken) return;
  try {
    await fetch(KAKAO_LOGOUT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {}
}

export const isKakaoConfigured = () => !!KAKAO_REST_API_KEY;
