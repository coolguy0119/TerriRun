// ── Apple HealthKit 서비스 ────────────────────────────────────
// 요구사항: EAS Build + 베어 워크플로 (Expo Go에서는 동작하지 않음)
// 패키지: npm install react-native-health
// app.json에 아래 추가 필요:
//   "plugins": [["react-native-health", { "NSHealthShareUsageDescription": "달리기 운동 데이터를 저장합니다.", "NSHealthUpdateUsageDescription": "달리기 운동 기록을 Apple Health에 저장합니다." }]]

let Health = null;
let initialized = false;

try {
  Health = require('react-native-health').default;
} catch {
  // react-native-health 미설치 또는 Expo Go 환경 — 무시
}

export function isHealthKitAvailable() {
  return !!Health;
}

export async function initHealthKit() {
  if (!Health || initialized) return initialized;
  return new Promise((resolve) => {
    const permissions = {
      permissions: {
        read: [
          Health.Constants.Permissions.DistanceWalkingRunning,
          Health.Constants.Permissions.ActiveEnergyBurned,
          Health.Constants.Permissions.StepCount,
        ],
        write: [
          Health.Constants.Permissions.Workout,
          Health.Constants.Permissions.DistanceWalkingRunning,
          Health.Constants.Permissions.ActiveEnergyBurned,
        ],
      },
    };
    Health.initHealthKit(permissions, (err) => {
      initialized = !err;
      if (err) console.warn('[HealthKit] init error:', err);
      resolve(initialized);
    });
  });
}

// distanceMeters: 총 거리(m), durationSeconds: 달리기 시간(초), endDate: 종료 시각(Date)
export async function saveRunWorkout({ distanceMeters, durationSeconds, endDate = new Date() }) {
  if (!Health) return false;
  if (!initialized) {
    const ok = await initHealthKit();
    if (!ok) return false;
  }
  const startDate = new Date(endDate.getTime() - durationSeconds * 1000);
  const kcal = Math.round(distanceMeters * 0.063); // 러닝 기준 약 63kcal/km
  const options = {
    type: Health.Constants.Activities.Running,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    distance: distanceMeters,
    distanceUnit: 'm',
    energyBurned: kcal,
    energyBurnedUnit: 'kcal',
  };
  return new Promise((resolve) => {
    Health.saveWorkout(options, (err) => {
      if (err) console.warn('[HealthKit] saveWorkout error:', err);
      resolve(!err);
    });
  });
}

// 오늘 총 걸음 수 조회
export async function getTodaySteps() {
  if (!Health || !initialized) return null;
  return new Promise((resolve) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    Health.getStepCount({ date: today.toISOString() }, (err, results) => {
      resolve(err ? null : (results?.value ?? 0));
    });
  });
}
