import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

// ── 설정 방법 ──────────────────────────────────────────────────
// 1. https://developers.kakao.com 에서 앱 생성
// 2. [플랫폼] → iOS 앱 등록 (번들 ID: com.yourname.terrarun)
// 3. REST API 키를 아래에 입력
// 4. [카카오 로그인] 활성화
// 5. Redirect URI 등록: terrarun://auth/kakao
export const KAKAO_REST_API_KEY = '1ad4867861562a94fce7f566e012db0f';

const KAKAO_AUTH_URL   = 'https://kauth.kakao.com/oauth/authorize';
const KAKAO_TOKEN_URL  = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USER_URL   = 'https://kapi.kakao.com/v2/user/me';
const KAKAO_LOGOUT_URL = 'https://kapi.kakao.com/v1/user/logout';

// Expo Go: exp://192.168.x.x:8081/--/auth/kakao
// 빌드:    terrarun://auth/kakao
export function getRedirectUri() {
  return Linking.createURL('auth/kakao');
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

  if (result.type === 'cancel' || result.type === 'dismiss') return null; // 사용자 취소
  if (result.type !== 'success' || !result.url) {
    throw new Error(
      `로그인 실패 (${result.type})\n\n카카오 개발자 콘솔에 아래 Redirect URI가 등록돼 있는지 확인하세요:\n${redirectUri}`
    );
  }

  const params = parseUrlParams(result.url);
  const code = params['code'];
  if (!code) {
    throw new Error(
      `인증 코드를 받지 못했습니다.\n\n카카오 개발자 콘솔 → [카카오 로그인] → Redirect URI에 아래 주소를 등록해주세요:\n${redirectUri}`
    );
  }

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
