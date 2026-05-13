import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getPlayer, savePlayer, getRunHistory, checkAndResetDaily } from '../utils/storage';
import { xpProgress, getLeague, getNextLeague, DAILY_MISSIONS, ACHIEVEMENTS } from '../game/GameEngine';
import { formatDistance, formatArea, cellsToArea } from '../utils/geo';

// ── Active theme ──────────────────────────────────────────────
const A = {
  bg:      '#0D0D0F',
  card:    '#16161C',
  border:  'rgba(255,255,255,0.07)',
  primary: '#FF5F1F',
  cyan:    '#00E5FF',
  green:   '#00C896',
  yellow:  '#FFD23F',
  text:    '#FFFFFF',
  text2:   'rgba(255,255,255,0.55)',
  text3:   'rgba(255,255,255,0.28)',
};

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [player, setPlayer] = useState(null);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    let p = await getPlayer();
    const reset = checkAndResetDaily(p);
    if (reset !== p) await savePlayer(reset);
    p = reset;
    setPlayer(p);
    const h = await getRunHistory();
    setHistory(h.slice(0, 10));
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  if (!player) return <View style={styles.container} />;

  const league = getLeague(player.totalCells);
  const nextLeague = getNextLeague(player.totalCells);
  const xpProg = xpProgress(player.xp);
  const totalArea = cellsToArea(player.totalCells);
  const xpPct = xpProg.needed > 0 ? xpProg.current / xpProg.needed : 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={A.primary} />}
    >
      {/* ── HEADER ── */}
      <LinearGradient
        colors={['#1C0800', '#0D0D0F']}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>오늘도 달려볼까요 🔥</Text>
            <Text style={styles.playerName}>{player.name}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarBtn}>
            <LinearGradient colors={['#FF5F1F', '#FF3C00']} style={styles.avatarGrad}>
              <Text style={styles.avatarText}>{player.name[0]}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* 리그 + 레벨 */}
        <View style={styles.badgeRow}>
          <View style={styles.leagueBadge}>
            <Text style={styles.leagueBadgeText}>{league.emoji} {league.name}</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>LV {player.level}</Text>
          </View>
          {player.streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>🔥 {player.streak}일 연속</Text>
            </View>
          )}
        </View>

        {/* XP 바 */}
        <View style={styles.xpBlock}>
          <View style={styles.xpLabelRow}>
            <Text style={styles.xpLabel}>XP</Text>
            <Text style={styles.xpValue}>
              {xpProg.needed > 0 ? `${xpProg.current} / ${xpProg.needed}` : 'MAX'}
            </Text>
          </View>
          <View style={styles.xpTrack}>
            <LinearGradient
              colors={['#FF5F1F', '#FFD23F']}
              style={[styles.xpFill, { width: `${Math.round(xpPct * 100)}%` }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
          </View>
          {nextLeague && (
            <Text style={styles.nextLeague}>
              {nextLeague.emoji} {nextLeague.name}까지 {nextLeague.minCells - player.totalCells}칸
            </Text>
          )}
        </View>
      </LinearGradient>

      {/* ── 달리기 CTA ── */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity onPress={() => navigation.navigate('Run')} activeOpacity={0.88}>
          <LinearGradient colors={['#FF5F1F', '#FF3C00']} style={styles.ctaBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <View style={styles.ctaLeft}>
              <Ionicons name="flash" size={26} color="#fff" />
              <View>
                <Text style={styles.ctaTitle}>달리기 시작</Text>
                <Text style={styles.ctaSub}>영토를 정복하러 출발!</Text>
              </View>
            </View>
            <View style={styles.ctaArrow}>
              <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.8)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── STATS ── */}
      <View style={styles.statsGrid}>
        <StatCard
          label="총 영토" value={formatArea(totalArea)}
          icon="map" accent={A.green}
          grad={['#005C40', '#00C896']}
        />
        <StatCard
          label="총 거리" value={formatDistance(player.totalDistance)}
          icon="walk" accent={A.cyan}
          grad={['#004D66', '#00E5FF']}
        />
        <StatCard
          label="달리기" value={`${player.totalRuns}회`}
          icon="fitness" accent={A.primary}
          grad={['#7A2000', '#FF5F1F']}
        />
        <StatCard
          label="연속" value={`${player.streak}일`}
          icon="flame" accent={A.yellow}
          grad={['#7A5000', '#FFD23F']}
        />
      </View>

      {/* ── 퀵 액션 ── */}
      {player.totalCells > 0 && (
        <ActionCard
          emoji="🛵" title="영토 배달 주문"
          sub={`내 영토 ${player.totalCells}칸 주변 식당`}
          accent={A.primary}
          onPress={() => navigation.navigate('Delivery')}
        />
      )}
      <ActionCard
        emoji="⚔️" title="러닝 아레나"
        sub="달리기 기록으로 캐릭터 강화"
        accent={A.cyan}
        onPress={() => navigation.navigate('Arena')}
      />

      {/* ── 오늘의 미션 ── */}
      <SectionLabel title="오늘의 미션" />
      <View style={styles.card}>
        {DAILY_MISSIONS.map((mission, i) => {
          const done = player.completedMissions.includes(mission.id);
          return (
            <View key={mission.id} style={[styles.missionRow, i < DAILY_MISSIONS.length - 1 && styles.divider]}>
              <View style={[styles.missionDot, done && styles.missionDotDone]}>
                {done
                  ? <Ionicons name="checkmark" size={14} color="#fff" />
                  : <Text style={styles.missionDotEmoji}>{mission.emoji}</Text>
                }
              </View>
              <View style={styles.missionInfo}>
                <Text style={[styles.missionName, done && styles.missionNameDone]}>{mission.name}</Text>
                <Text style={styles.missionDesc}>{mission.desc}</Text>
              </View>
              {!done && (
                <View style={styles.missionReward}>
                  <Text style={styles.rewardXp}>+{mission.xpReward} XP</Text>
                  <Text style={styles.rewardCoin}>+{mission.coinReward}🪙</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* ── 최근 달리기 ── */}
      <SectionLabel title="최근 달리기" />
      {history.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="walk-outline" size={32} color={A.text3} />
          <Text style={styles.emptyText}>아직 달리기 기록이 없어요</Text>
          <Text style={styles.emptySub}>첫 번째 달리기를 시작해봐요!</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {history.map((run, i) => (
            <View key={run.id} style={[styles.runRow, i < history.length - 1 && styles.divider]}>
              <LinearGradient colors={['#7A2000', '#FF5F1F']} style={styles.runIconWrap}>
                <Ionicons name="walk-outline" size={16} color="#fff" />
              </LinearGradient>
              <View style={styles.runInfo}>
                <Text style={styles.runDist}>{formatDistance(run.distance)}</Text>
                <Text style={styles.runDate}>{new Date(run.date).toLocaleDateString('ko-KR')}</Text>
              </View>
              <View style={styles.runRight}>
                <Text style={styles.runCells}>+{run.cells}칸</Text>
                <Text style={styles.runXp}>+{run.xpGain} XP</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── 업적 ── */}
      <SectionLabel title="업적 컬렉션" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achRow}>
        {ACHIEVEMENTS.map((ach) => {
          const unlocked = player.achievements.includes(ach.id);
          return (
            <View key={ach.id} style={[styles.achCard, unlocked && styles.achUnlocked]}>
              <Text style={styles.achEmoji}>{unlocked ? ach.emoji : '🔒'}</Text>
              <Text style={[styles.achName, unlocked && { color: A.primary }]}>{ach.name}</Text>
            </View>
          );
        })}
      </ScrollView>
    </ScrollView>
  );
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────

function StatCard({ label, value, icon, accent, grad }) {
  return (
    <View style={styles.statCard}>
      <LinearGradient colors={grad} style={styles.statIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Ionicons name={`${icon}-outline`} size={15} color="#fff" />
      </LinearGradient>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({ emoji, title, sub, accent, onPress }) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.82}>
      <View style={[styles.actionIcon, { backgroundColor: accent + '18', borderColor: accent + '40' }]}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={A.text3} />
    </TouchableOpacity>
  );
}

function SectionLabel({ title }) {
  return (
    <View style={styles.sectionLabel}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionText}>{title.toUpperCase()}</Text>
    </View>
  );
}

// ── 스타일 ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: A.bg },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { color: A.text2, fontSize: 13, fontWeight: '500', marginBottom: 4 },
  playerName: { color: A.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  avatarBtn: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden' },
  avatarGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
  leagueBadge: { backgroundColor: 'rgba(255,95,31,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,95,31,0.35)' },
  leagueBadgeText: { color: A.primary, fontSize: 12, fontWeight: '700' },
  levelBadge: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: A.border },
  levelBadgeText: { color: A.text2, fontSize: 12, fontWeight: '700' },
  streakBadge: { backgroundColor: 'rgba(255,210,63,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,210,63,0.3)' },
  streakBadgeText: { color: A.yellow, fontSize: 12, fontWeight: '700' },

  xpBlock: { gap: 6 },
  xpLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLabel: { color: A.text2, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  xpValue: { color: A.text3, fontSize: 11 },
  xpTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 3 },
  nextLeague: { color: A.text3, fontSize: 10, marginTop: 2 },

  // CTA
  ctaWrap: { margin: 12, marginTop: 14 },
  ctaBtn: { borderRadius: 20, padding: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctaLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ctaTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  ctaSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  ctaArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginBottom: 6 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: A.card, borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: A.border },
  statIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { color: A.text3, fontSize: 11, fontWeight: '600' },

  // Action cards
  actionCard: { marginHorizontal: 12, marginBottom: 8, backgroundColor: A.card, borderRadius: 16, borderWidth: 1, borderColor: A.border, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  actionIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actionTitle: { color: A.text, fontSize: 15, fontWeight: '700' },
  actionSub: { color: A.text2, fontSize: 12, marginTop: 2 },

  // Section label
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 10 },
  sectionAccent: { width: 3, height: 14, backgroundColor: A.primary, borderRadius: 2 },
  sectionText: { color: A.text2, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },

  // Card
  card: { marginHorizontal: 12, backgroundColor: A.card, borderRadius: 16, borderWidth: 1, borderColor: A.border, overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },

  // Mission
  missionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  missionDot: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: A.border, alignItems: 'center', justifyContent: 'center' },
  missionDotDone: { backgroundColor: A.primary, borderColor: A.primary },
  missionDotEmoji: { fontSize: 16 },
  missionInfo: { flex: 1 },
  missionName: { color: A.text, fontSize: 14, fontWeight: '600' },
  missionNameDone: { color: A.text3, textDecorationLine: 'line-through' },
  missionDesc: { color: A.text2, fontSize: 11, marginTop: 2 },
  missionReward: { alignItems: 'flex-end' },
  rewardXp: { color: A.primary, fontSize: 12, fontWeight: '700' },
  rewardCoin: { color: A.text2, fontSize: 10 },

  // Empty
  emptyCard: { margin: 12, backgroundColor: A.card, borderRadius: 16, padding: 32, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: A.border },
  emptyText: { color: A.text2, fontSize: 15, fontWeight: '600' },
  emptySub: { color: A.text3, fontSize: 12 },

  // Run history
  runRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  runIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  runInfo: { flex: 1 },
  runDist: { color: A.text, fontSize: 15, fontWeight: '700' },
  runDate: { color: A.text3, fontSize: 11, marginTop: 2 },
  runRight: { alignItems: 'flex-end' },
  runCells: { color: A.primary, fontSize: 13, fontWeight: '700' },
  runXp: { color: A.text3, fontSize: 10 },

  // Achievements
  achRow: { paddingHorizontal: 12, gap: 10, paddingBottom: 4 },
  achCard: { backgroundColor: A.card, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, width: 82, borderWidth: 1, borderColor: A.border },
  achUnlocked: { borderColor: 'rgba(255,95,31,0.4)', backgroundColor: 'rgba(255,95,31,0.07)' },
  achEmoji: { fontSize: 24 },
  achName: { color: A.text3, fontSize: 10, textAlign: 'center', fontWeight: '600' },
});
