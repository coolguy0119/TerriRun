import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getPlayer, getRunHistory, checkAndResetDaily } from '../utils/storage';
import { calcLevel, xpProgress, getLeague, getNextLeague, DAILY_MISSIONS, ACHIEVEMENTS } from '../game/GameEngine';
import { formatDistance, formatArea, cellsToArea } from '../utils/geo';
import { C, G, hpColor, shadow } from '../theme/pokemon';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [player, setPlayer] = useState(null);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    let p = await getPlayer();
    p = checkAndResetDaily(p);
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
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.yellow} />}
    >
      {/* ── HEADER ── */}
      <LinearGradient colors={G.header} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>안녕하세요 👋</Text>
            <Text style={styles.playerName}>{player.name}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarBtn}>
            <LinearGradient colors={G.vibrant} style={styles.avatarGrad}>
              <Text style={styles.avatarText}>{player.name[0]}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.leagueRow}>
          <View style={styles.leagueBadge}>
            <Text style={styles.leagueBadgeText}>{league.emoji} {league.name}</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>Lv. {player.level}</Text>
          </View>
          {nextLeague && (
            <Text style={styles.leagueNext}>다음까지 {nextLeague.minCells - player.totalCells}칸</Text>
          )}
        </View>

        <View style={styles.xpSection}>
          <View style={styles.xpLabelRow}>
            <Text style={styles.xpLabel}>경험치</Text>
            <Text style={styles.xpValue}>
              {xpProg.needed > 0 ? `${xpProg.current} / ${xpProg.needed}` : 'MAX'}
            </Text>
          </View>
          <View style={styles.xpBarBg}>
            <LinearGradient
              colors={G.primary}
              style={[styles.xpBarFill, { width: `${Math.round(xpPct * 100)}%` }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
          </View>
        </View>
      </LinearGradient>

      {/* ── STAT CARDS ── */}
      <View style={styles.statsGrid}>
        <StatCard label="영토" value={formatArea(totalArea)} icon="map" color={C.green} gradColors={G.green} />
        <StatCard label="거리" value={formatDistance(player.totalDistance)} icon="walk" color={C.blue} gradColors={G.blue} />
        <StatCard label="달리기" value={`${player.totalRuns}회`} icon="fitness" color={C.orange} gradColors={G.orange} />
        <StatCard label="연속" value={`${player.streak}일`} icon="flame" color={C.red} gradColors={G.pink} />
      </View>

      {/* ── 달리기 시작 버튼 ── */}
      <TouchableOpacity style={styles.runCta} onPress={() => navigation.navigate('Run')} activeOpacity={0.85}>
        <LinearGradient colors={G.vibrant} style={styles.runCtaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="play-circle" size={28} color="#fff" />
          <Text style={styles.runCtaText}>달리기 시작</Text>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── 배달 / 아레나 ── */}
      {player.totalCells > 0 && (
        <PokeCard
          emoji="🛵"
          title="영토 배달 주문"
          sub={`내 영토 ${player.totalCells}칸 주변 식당`}
          color={C.orange}
          onPress={() => navigation.navigate('Delivery')}
        />
      )}
      <PokeCard
        emoji="⚔️"
        title="러닝 아레나"
        sub="달리기 기록으로 캐릭터 강화"
        color={C.yellow}
        onPress={() => navigation.navigate('Arena')}
      />

      {/* ── 오늘의 미션 ── */}
      <SectionHeader title="오늘의 미션" emoji="🎯" />
      <View style={styles.card}>
        {DAILY_MISSIONS.map((mission, i) => {
          const done = player.completedMissions.includes(mission.id);
          return (
            <View key={mission.id} style={[styles.missionRow, i < DAILY_MISSIONS.length - 1 && styles.divider]}>
              <Text style={styles.missionEmoji}>{mission.emoji}</Text>
              <View style={styles.missionInfo}>
                <Text style={[styles.missionName, done && styles.missionDone]}>{mission.name}</Text>
                <Text style={styles.missionDesc}>{mission.desc}</Text>
              </View>
              <View style={styles.missionReward}>
                {done
                  ? <Ionicons name="checkmark-circle" size={24} color={C.yellow} />
                  : <>
                      <Text style={styles.rewardXp}>+{mission.xpReward}EXP</Text>
                      <Text style={styles.rewardCoin}>+{mission.coinReward}🪙</Text>
                    </>
                }
              </View>
            </View>
          );
        })}
      </View>

      {/* ── 최근 달리기 ── */}
      <SectionHeader title="배틀 기록" emoji="📋" />
      {history.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>아직 배틀 기록이 없어요</Text>
          <Text style={styles.emptySubtext}>첫 달리기를 시작해보세요!</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {history.map((run, i) => (
            <View key={run.id} style={[styles.runRow, i < history.length - 1 && styles.divider]}>
              <View style={styles.runIcon}>
                <Ionicons name="walk-outline" size={18} color={C.yellow} />
              </View>
              <View style={styles.runInfo}>
                <Text style={styles.runDist}>{formatDistance(run.distance)}</Text>
                <Text style={styles.runDate}>{new Date(run.date).toLocaleDateString('ko-KR')}</Text>
              </View>
              <View style={styles.runStats}>
                <Text style={styles.runCells}>+{run.cells}칸</Text>
                <Text style={styles.runXp}>+{run.xpGain}EXP</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── 업적 ── */}
      <SectionHeader title="뱃지 컬렉션" emoji="🏅" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achRow}>
        {ACHIEVEMENTS.map((ach) => {
          const unlocked = player.achievements.includes(ach.id);
          return (
            <View key={ach.id} style={[styles.achCard, unlocked && styles.achUnlocked]}>
              <Text style={styles.achEmoji}>{unlocked ? ach.emoji : '🔒'}</Text>
              <Text style={[styles.achName, unlocked && { color: C.yellow }]}>{ach.name}</Text>
            </View>
          );
        })}
      </ScrollView>
    </ScrollView>
  );
}

function StatCard({ label, value, icon, color, gradColors }) {
  return (
    <View style={styles.statCard}>
      <LinearGradient colors={gradColors} style={styles.statIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Ionicons name={`${icon}-outline`} size={16} color="#fff" />
      </LinearGradient>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, emoji }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEmoji}>{emoji}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function PokeCard({ emoji, title, sub, color, onPress }) {
  return (
    <TouchableOpacity style={styles.pokeCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.pokeCardIcon, { backgroundColor: color + '22', borderColor: color + '44' }]}>
        <Text style={styles.pokeCardEmoji}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.pokeCardTitle}>{title}</Text>
        <Text style={styles.pokeCardSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.text3} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { color: C.text2, fontSize: 13, fontWeight: '500', marginBottom: 4 },
  playerName: { color: C.text, fontSize: 26, fontWeight: '700' },
  avatarBtn: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden' },
  avatarGrad: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  leagueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  leagueBadge: { backgroundColor: 'rgba(167,139,250,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)' },
  leagueBadgeText: { color: C.yellow, fontSize: 12, fontWeight: '600' },
  levelBadge: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: C.border },
  levelBadgeText: { color: C.text2, fontSize: 12, fontWeight: '600' },
  leagueNext: { color: C.text3, fontSize: 11 },

  xpSection: { gap: 8 },
  xpLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLabel: { color: C.text2, fontWeight: '600', fontSize: 12 },
  xpValue: { color: C.text3, fontSize: 12 },
  xpBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 3 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: C.card, borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: C.border },
  statIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { color: C.text3, fontSize: 11, fontWeight: '500' },

  runCta: { marginHorizontal: 12, marginBottom: 10, borderRadius: 18, overflow: 'hidden' },
  runCtaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingHorizontal: 22 },
  runCtaText: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1, marginLeft: 12 },

  pokeCard: { marginHorizontal: 12, marginBottom: 8, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  pokeCardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  pokeCardEmoji: { fontSize: 22 },
  pokeCardTitle: { color: C.text, fontSize: 15, fontWeight: '600' },
  pokeCardSub: { color: C.text2, fontSize: 12, marginTop: 3 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  sectionEmoji: { fontSize: 15 },
  sectionTitle: { color: C.text2, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  sectionLine: { flex: 1, height: 1, backgroundColor: C.border, borderRadius: 1 },

  card: { marginHorizontal: 12, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  divider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  missionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  missionEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  missionInfo: { flex: 1 },
  missionName: { color: C.text, fontSize: 14, fontWeight: '600' },
  missionDone: { color: C.text3, textDecorationLine: 'line-through' },
  missionDesc: { color: C.text2, fontSize: 12, marginTop: 2 },
  missionReward: { alignItems: 'flex-end' },
  rewardXp: { color: C.yellow, fontSize: 12, fontWeight: '700' },
  rewardCoin: { color: C.text2, fontSize: 11 },

  emptyCard: { margin: 12, backgroundColor: C.card, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  emptyText: { color: C.text2, fontSize: 15, fontWeight: '600' },
  emptySubtext: { color: C.text3, fontSize: 13, marginTop: 4 },

  runRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  runIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(167,139,250,0.15)', alignItems: 'center', justifyContent: 'center' },
  runInfo: { flex: 1 },
  runDist: { color: C.text, fontSize: 15, fontWeight: '600' },
  runDate: { color: C.text3, fontSize: 12, marginTop: 2 },
  runStats: { alignItems: 'flex-end' },
  runCells: { color: C.yellow, fontSize: 13, fontWeight: '700' },
  runXp: { color: C.blue, fontSize: 11 },

  achRow: { paddingHorizontal: 12, gap: 10, paddingBottom: 4 },
  achCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, width: 80, borderWidth: 1, borderColor: C.border },
  achUnlocked: { borderColor: 'rgba(167,139,250,0.4)', backgroundColor: 'rgba(167,139,250,0.08)' },
  achEmoji: { fontSize: 24 },
  achName: { color: C.text3, fontSize: 10, textAlign: 'center', fontWeight: '500' },
});
