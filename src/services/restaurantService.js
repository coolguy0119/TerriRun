// ── 카카오 로컬 API 키 설정 ────────────────────────────────────
// 카카오 개발자 콘솔(developers.kakao.com)에서 REST API 키를 발급받아 아래에 입력하세요.
const KAKAO_REST_API_KEY = ''; // 예: 'abc1234def5678...'

const KAKAO_CATEGORY_CODES = {
  '음식점': 'FD6',
  '카페':   'CE7',
};

// ── Mock 데이터 (API 키 없을 때 사용) ─────────────────────────
const MOCK_RESTAURANTS = [
  { id: '1', name: '황금 돼지갈비', category: '한식 > 돼지고기구이', distance: 120, address: '근처 1번지', phone: '02-1234-5678', lat: 0, lng: 0 },
  { id: '2', name: '스시 오마카세', category: '일식 > 초밥,롤', distance: 230, address: '근처 2번지', phone: '02-2345-6789', lat: 0, lng: 0 },
  { id: '3', name: '치킨마루', category: '치킨', distance: 350, address: '근처 3번지', phone: '02-3456-7890', lat: 0, lng: 0 },
  { id: '4', name: '봉구스 밥버거', category: '분식', distance: 410, address: '근처 4번지', phone: '02-4567-8901', lat: 0, lng: 0 },
  { id: '5', name: '피자 팩토리', category: '양식 > 피자', distance: 480, address: '근처 5번지', phone: '02-5678-9012', lat: 0, lng: 0 },
  { id: '6', name: '짬뽕 대왕', category: '중식 > 중화요리', distance: 540, address: '근처 6번지', phone: '02-6789-0123', lat: 0, lng: 0 },
  { id: '7', name: '버거킹', category: '패스트푸드', distance: 620, address: '근처 7번지', phone: '02-7890-1234', lat: 0, lng: 0 },
  { id: '8', name: '카페 베네', category: '카페 > 커피', distance: 700, address: '근처 8번지', phone: '02-8901-2345', lat: 0, lng: 0 },
];

// ── 실제 카카오 API 호출 ───────────────────────────────────────
async function fetchFromKakao(lat, lng, radius = 500) {
  const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&x=${lng}&y=${lat}&radius=${radius}&sort=distance`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
  });
  if (!res.ok) throw new Error('Kakao API 오류');
  const data = await res.json();
  return data.documents.map((doc) => ({
    id: doc.id,
    name: doc.place_name,
    category: doc.category_name,
    distance: parseInt(doc.distance),
    address: doc.road_address_name || doc.address_name,
    phone: doc.phone,
    lat: parseFloat(doc.y),
    lng: parseFloat(doc.x),
    url: doc.place_url,
  }));
}

// ── 공개 함수 ─────────────────────────────────────────────────
export async function getNearbyRestaurants(lat, lng, radius = 500) {
  if (!KAKAO_REST_API_KEY) {
    // API 키 없음 → mock 데이터 반환 (거리에 약간의 랜덤성 추가)
    return MOCK_RESTAURANTS.map((r) => ({
      ...r,
      distance: r.distance + Math.floor(Math.random() * 50),
    }));
  }
  try {
    return await fetchFromKakao(lat, lng, radius);
  } catch {
    return MOCK_RESTAURANTS;
  }
}

export function isMockData() {
  return !KAKAO_REST_API_KEY;
}
