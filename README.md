# 🏃 TerriRun — 달리면서 영토를 정복하라!

실제 GPS로 달리면서 지도 위의 영토를 캡처하는 iOS 게임 앱

---

## 📱 스크린샷 미리보기

```
[홈 화면]           [달리기 화면]        [프로필]
 리그 배지           어두운 지도          업적 목록
 XP 바              초록 영토            리더보드
 일일 미션           빨간 적 영토         코인/통계
 달리기 시작 버튼    HUD (거리/페이스)    연속 달리기
```

---

## 🎮 게임 기능

| 기능 | 설명 |
|------|------|
| **영토 캡처** | GPS 경로를 달리면 지나간 지역(~55m 격자)이 내 영토로 |
| **적 영토** | 주변에 랜덤으로 적 영토 생성 — 여러 번 통과해야 탈환 |
| **XP & 레벨** | 거리(15m당 1XP) + 영토 캡처(칸당 30XP) + 적 탈환(80XP) |
| **리그 시스템** | 브론즈 → 실버 → 골드 → 플래티넘 → 다이아 → 챔피언 |
| **업적 12종** | 첫 달리기, 거리 5/21/42km, 영토 10/50/200칸, 연속 달리기 등 |
| **일일 미션** | 매일 리셋되는 미션 3종 (달리기, 거리, 영토) |
| **코인 시스템** | 캡처 칸마다 코인 획득 (향후 업그레이드에 사용) |
| **연속 달리기** | 매일 달리면 스트릭 유지 |

---

## 🚀 설치 & 실행

### 사전 요구사항
- [Node.js](https://nodejs.org) 18 이상
- [Expo Go](https://expo.dev/go) 앱 (iPhone에 설치)
- 또는 Xcode (실제 빌드용)

### 설치

```bash
git clone <repo>
cd TerriRun
npm install
npx expo start
```

### 실행

1. `npx expo start` 실행
2. iPhone에서 카메라로 QR코드 스캔
3. Expo Go에서 앱 실행

---

## 🏗️ 실제 iOS 앱 빌드 (EAS Build)

```bash
# EAS CLI 설치
npm install -g eas-cli

# Expo 계정 로그인 (무료)
eas login

# 프로젝트 초기화
eas build:configure

# iOS 빌드 (TestFlight 배포용)
eas build --platform ios --profile preview

# App Store 빌드
eas build --platform ios --profile production
```

### app.json 수정 필요
```json
"bundleIdentifier": "com.여러분이름.terrirun"
```

---

## 📁 프로젝트 구조

```
TerriRun/
├── App.js                          # 네비게이션 (탭 + 스택)
├── app.json                        # Expo / iOS 권한 설정
├── package.json
└── src/
    ├── screens/
    │   ├── HomeScreen.js           # 대시보드 (미션, 통계, 기록)
    │   ├── RunScreen.js            # 지도 + 달리기 메인 화면
    │   └── ProfileScreen.js        # 프로필, 업적, 리더보드
    ├── components/
    │   └── RunResultModal.js       # 달리기 완료 결과 팝업
    ├── game/
    │   └── GameEngine.js           # XP, 레벨, 업적, 미션 로직
    ├── utils/
    │   ├── geo.js                  # 위치 계산, 격자 변환, 포맷팅
    │   └── storage.js              # AsyncStorage CRUD
    └── assets/
        └── mapStyle.json           # 다크 맵 스타일
```

---

## 🔧 핵심 로직

### 영토 격자 시스템
```
CELL_SIZE = 0.0005° ≈ 55m × 55m
cell_key = "${floor(lat/0.0005)}_${floor(lng/0.0005)}"
```

### XP 계산
```
XP = (거리m ÷ 15) + (새 영토칸 × 30) + (적 탈환칸 × 80)
```

### 레벨 테이블
| 레벨 | 필요 XP |
|------|---------|
| 1 | 0 |
| 2 | 200 |
| 3 | 500 |
| 4 | 900 |
| 5 | 1,400 |
| 10 | 6,100 |
| 20 | 33,500 |

---

## 📦 주요 라이브러리

| 패키지 | 용도 |
|--------|------|
| `expo-location` | GPS 추적 (포그라운드/백그라운드) |
| `react-native-maps` | MapKit 기반 지도 + Polygon 오버레이 |
| `expo-haptics` | 영토 캡처 시 진동 피드백 |
| `expo-linear-gradient` | UI 그라디언트 |
| `@react-navigation/*` | 탭 + 스택 네비게이션 |
| `@react-native-async-storage` | 영토/플레이어 데이터 로컬 저장 |

---

## 🗺️ 향후 기능 로드맵

- [ ] **멀티플레이어** — Firebase Realtime DB로 실시간 영토 경쟁
- [ ] **영토 업그레이드** — 코인으로 방어력 강화 (1~5레벨)
- [ ] **클랜 시스템** — 팀으로 영토 확장
- [ ] **이벤트 지역** — 특정 랜드마크 점령 시 보너스
- [ ] **통계 차트** — 주간/월간 달리기 분석
- [ ] **Apple HealthKit** — 운동 데이터 연동
- [ ] **백그라운드 추적** — 화면 꺼도 경로 기록

---

## ⚙️ iOS 권한 (자동 설정됨)

`app.json`에 이미 포함:
- `NSLocationWhenInUseUsageDescription` — 포그라운드 위치
- `NSLocationAlwaysAndWhenInUseUsageDescription` — 백그라운드 위치
- `UIBackgroundModes: ["location"]` — 백그라운드 GPS

---

## 📄 라이센스

MIT License — 자유롭게 사용, 수정, 배포 가능
