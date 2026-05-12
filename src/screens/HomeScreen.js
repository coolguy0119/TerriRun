import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getPlayer, getRunHistory, checkAndResetDaily } from '../utils/storage';
import { calcLevel, xpProgress, getLeague, getNextLeague, DAILY_MISSIONS, ACHIEVEMENTS } from '../game/GameEngine';
import { formatDistance, formatArea, cellsToArea } from '../utils/geo';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [player, setPlayer] = useState(null);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => { loadData(); }, [])
  );

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22d97a" />}
    >
      {/* Header */}
      <LinearGradient colors={['#0d1117', '#0f1f10']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>안녕하세요 👋</Text>
            <Text style={styles.playerName}>{player.name}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarBtn}>
            <Text style={styles.avatarText}>{player.name[0]}</Text>
          </TouchableOpacity>
        </View>

        {/* League badge */}
        <View style={styles.leagueBadge}>
          <Text style={styles.leagueEmoji}>{league.emoji}</Text>
          <View>
            <Text style={styles.leagueName}>{league.name} 리그</Text>
            {nextLeague && (
              <Text style={styles.leagueNext}>
                다음 리그까지 {nextLeague.minCells - player.totalCells}칸
              </Text>
            )}
          </View>
        </View>

        {/* XP Bar */}
        <View style={styles.xpSection}>
          <View style={styles.xpLabelRow}>
            <Text style={styles.xpLabel}>레벨 {player.level}</Text>
            <Text style={styles.xpValue}>
              {xpProg.needed > 0 ? `${xpProg.current} / ${xpProg.needed} XP` : 'MAX'}
            </Text>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${(xpProg.percent * 100).toFixed(0)}%` }]} />
          </View>
        </View>
      </LinearGradient>

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <StatCard label="총 영토" value={formatArea(totalArea)} icon="map" color="#22d97a" />
        <StatCard label="총 거리" value={formatDistance(player.totalDistance)} icon="walk" color="#3b82f6" />
        <StatCard label="달린 횟수" value={`${player.totalRuns}회`} icon="fitness" color="#f59e0b" />
        <StatCard label="연속 달리기" value={`${player.streak}일`} icon="flame" color="#ef4444" />
      </View>

      {/* Start Run CTA */}
      <TouchableOpacity style={styles.runCta} onPress={() => navigation.navigate('Run')} activeOpacity={0.85}>
        <LinearGradient colors={['#22d97a', '#16a057']} style={styles.runCtaGrad}>
          <Ionicons name="play-circle" size={32} color="#000" />
          <Text style={styles.runCtaText}>달리기 시작하기</Text>
          <Ionicons name="chevron-forward" size={20} color="rgba(0,0,0,0.5)" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Daily Missions */}
      <SectionHeader title="오늘의 미션" emoji="🎯" />
      <View style={styles.card}>
        {DAILY_MISSIONS.map((mission) => {
          const done = player.completedMissions.includes(mission.id);
          const progress = mission.check(player);
          return (
            <View key={mission.id} style={styles.missionRow}>
              <Text style={styles.missionEmoji}>{mission.emoji}</Text>
              <View style={styles.missionInfo}>
                <Text style={[styles.missionName, done && styles.missionDone]}>{mission.name}</Text>
                <Text style={styles.missionDesc}>{mission.desc}</Text>
              </View>
              <View style={styles.missionReward}>
                {done
                  ? <Ionicons name="checkmark-circle" size={24} color="#22d97a" />
                  : (
                    <View>
                      <Text style={styles.rewardXp}>+{mission.xpReward}XP</Text>
                      <Text style={styles.rewardCoin}>+{mission.coinReward}🪙</Text>
                    </View>
                  )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Recent Runs */}
      <SectionHeader title="최근 달리기" emoji="🏃" />
      {history.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>아직 달리기 기록이 없어요</Text>
          <Text style={styles.emptySubtext}>첫 달리기를 시작해보세요!</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {history.map((run, i) => (
            <View key={run.id} style={[styles.runRow, i < history.length - 1 && styles.runDivider]}>
              <View style={styles.runIcon}>
                <Ionicons name="walk-outline" size={20} color="#22d97a" />
              </View>
              <View style={styles.runInfo}>
                <Text style={styles.runDist}>{formatDistance(run.distance)}</Text>
                <Text style={styles.runDate}>{new Date(run.date).toLocaleDateString('ko-KR')}</Text>
              </View>
              <View style={styles.runStats}>
                <Text style={styles.runCells}>+{run.cells}칸</Text>
                <Text style={styles.runXp}>+{run.xpGain}XP</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Achievements preview */}
      <SectionHeader title="업적" emoji="🏅" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achRow}>
        {ACHIEVEMENTS.map((ach) => {
          const unlocked = player.achievements.includes(ach.id);
          return (
            <View key={ach.id} style={[styles.achCard, !unlocked && styles.achLocked]}>
              <Text style={styles.achEmoji}>{unlocked ? ach.emoji : '🔒'}</Text>
              <Text style={[styles.achName, !unlocked && styles.achLockedText]}>{ach.name}</Text>
            </View>
          );
        })}
      </ScrollView>
    </ScrollView>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon + '-outline'} size={20} color={color} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { color: '#666', fontSize: 13 },
  playerName: { color: '#fff', fontSize: 22, fontWeight: '700' },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#22d97a', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#000', fontSize: 18, fontWeight: '700' },

  leagueBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, marginBottom: 16 },
  leagueEmoji: { fontSize: 28 },
  leagueName: { color: '#fff', fontWeight: '600', fontSize: 15 },
  leagueNext: { color: '#666', fontSize: 12, marginTop: 2 },

  xpSection: { gap: 6 },
  xpLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLabel: { color: '#22d97a', fontWeight: '600', fontSize: 13 },
  xpValue: { color: '#666', fontSize: 12 },
  xpBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: '#22d97a', borderRadius: 3 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#141c14', borderRadius: 12, padding: 14, alignItems: 'flex-start', gap: 6, borderWidth: 1, borderColor: 'rgba(34,217,122,0.12)' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { color: '#555', fontSize: 12 },

  runCta: { marginHorizontal: 12, marginBottom: 8, borderRadius: 16, overflow: 'hidden' },
  runCtaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, paddingHorizontal: 20 },
  runCtaText: { color: '#000', fontSize: 18, fontWeight: '700', flex: 1, marginLeft: 12 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  sectionEmoji: { fontSize: 18 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },

  card: { marginHorizontal: 12, backgroundColor: '#141c14', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(34,217,122,0.1)', overflow: 'hidden' },
  missionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  missionEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  missionInfo: { flex: 1 },
  missionName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  missionDone: { color: '#444', textDecorationLine: 'line-through' },
  missionDesc: { color: '#555', fontSize: 12, marginTop: 2 },
  missionReward: { alignItems: 'flex-end' },
  rewardXp: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },
  rewardCoin: { color: '#888', fontSize: 11 },

  emptyCard: { margin: 12, backgroundColor: '#141c14', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  emptyText: { color: '#888', fontSize: 15 },
  emptySubtext: { color: '#444', fontSize: 13, marginTop: 4 },

  runRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  runDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  runIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(34,217,122,0.12)', alignItems: 'center', justifyContent: 'center' },
  runInfo: { flex: 1 },
  runDist: { color: '#fff', fontSize: 15, fontWeight: '600' },
  runDate: { color: '#555', fontSize: 12 },
  runStats: { alignItems: 'flex-end' },
  runCells: { color: '#22d97a', fontSize: 13, fontWeight: '600' },
  runXp: { color: '#f59e0b', fontSize: 11 },

  achRow: { paddingHorizontal: 12, gap: 10, paddingBottom: 4 },
  achCard: { backgroundColor: '#141c14', borderRadius: 12, padding: 12, alignItems: 'center', gap: 6, width: 80, borderWidth: 1, borderColor: 'rgba(34,217,122,0.2)' },
  achLocked: { borderColor: 'rgba(255,255,255,0.05)', opacity: 0.5 },
  achEmoji: { fontSize: 24 },
  achName: { color: '#ccc', fontSize: 10, textAlign: 'center' },
  achLockedText: { color: '#444' },
});
