import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getPlayer } from '../utils/storage';
import { ARENAS, calcCharacterStats, getCharacterEmoji } from '../game/GameEngine';

function StatBar({ label, value, color }) {
  return (
    <View style={styles.statBarRow}>
      <Text style={styles.statBarLabel}>{label}</Text>
      <View style={styles.statBarBg}>
        <View style={[styles.statBarFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.statBarVal, { color }]}>{value}</Text>
    </View>
  );
}

export default function ArenaScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [player, setPlayer] = useState(null);

  useFocusEffect(
    useCallback(() => { getPlayer().then(setPlayer); }, [])
  );

  if (!player) return <View style={styles.container} />;

  const stats = calcCharacterStats(player);
  const charEmoji = getCharacterEmoji(player.level);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0f1a0f', '#0d1117']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🏟️ 러닝 아레나</Text>
          <Text style={styles.headerSub}>실제 달리기 기록으로 캐릭터가 강해집니다</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* My Character Card */}
        <View style={styles.charCard}>
          <LinearGradient colors={['#0f2a1a', '#141c14']} style={styles.charCardInner}>
            <Text style={styles.charEmoji}>{charEmoji}</Text>
            <View style={styles.charInfo}>
              <Text style={styles.charName}>{player.name}</Text>
              <Text style={styles.charLevel}>Lv.{player.level} 러너</Text>
            </View>
            <View style={styles.overallBadge}>
              <Text style={styles.overallLabel}>종합</Text>
              <Text style={styles.overallVal}>{stats.overall}</Text>
            </View>
          </LinearGradient>

          <View style={styles.statsSection}>
            <StatBar label="속도" value={stats.speed}   color="#3b82f6" />
            <StatBar label="체력" value={stats.stamina} color="#22d97a" />
            <StatBar label="파워" value={stats.power}   color="#f59e0b" />
          </View>

          <View style={styles.statHint}>
            <Text style={styles.hintText}>💡 더 빠른 페이스 → 속도↑ · 더 많이 달리기 → 체력↑ · 레벨업 → 파워↑</Text>
          </View>
        </View>

        {/* Arena List */}
        <Text style={styles.sectionTitle}>경기장 선택</Text>
        {ARENAS.map((arena) => {
          const unlocked = player.level >= arena.requiredLevel;
          const topOpponent = arena.opponents[arena.opponents.length - 1];
          const canWin = stats.overall >= topOpponent.overall * 0.6;

          return (
            <TouchableOpacity
              key={arena.id}
              style={[styles.arenaCard, !unlocked && styles.arenaLocked]}
              activeOpacity={unlocked ? 0.82 : 1}
              onPress={() => unlocked && navigation.navigate('Race', { arena, playerStats: stats, player, charEmoji })}
            >
              <View style={[styles.arenaColorBar, { backgroundColor: unlocked ? arena.color : '#333' }]} />
              <View style={styles.arenaBody}>
                <View style={styles.arenaTop}>
                  <Text style={styles.arenaEmoji}>{unlocked ? arena.emoji : '🔒'}</Text>
                  <View style={styles.arenaInfo}>
                    <Text style={[styles.arenaName, !unlocked && styles.lockedText]}>{arena.name}</Text>
                    <Text style={styles.arenaDesc}>{arena.desc}</Text>
                  </View>
                </View>

                <View style={styles.arenaBottom}>
                  {/* Opponents preview */}
                  <View style={styles.opponentRow}>
                    {arena.opponents.map((op) => (
                      <View key={op.name} style={styles.opponentChip}>
                        <Text style={styles.opponentEmoji}>{op.emoji}</Text>
                        <Text style={styles.opponentPower}>{op.overall}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Rewards */}
                  <View style={styles.rewardRow}>
                    <Text style={styles.rewardText}>🏆 +{arena.winXP}XP +{arena.winCoin}🪙</Text>
                    {!unlocked && (
                      <Text style={styles.lockText}>Lv.{arena.requiredLevel} 필요</Text>
                    )}
                    {unlocked && !canWin && (
                      <Text style={styles.warningText}>⚠️ 강적 주의</Text>
                    )}
                  </View>
                </View>
              </View>
              {unlocked && <Ionicons name="chevron-forward" size={18} color="#444" style={styles.chevron} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 14, gap: 12 },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: '#22d97a', fontSize: 12, marginTop: 2 },

  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  charCard: { backgroundColor: '#141c14', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(34,217,122,0.15)', overflow: 'hidden', marginBottom: 4 },
  charCardInner: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  charEmoji: { fontSize: 48 },
  charInfo: { flex: 1 },
  charName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  charLevel: { color: '#22d97a', fontSize: 13, marginTop: 2 },
  overallBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10 },
  overallLabel: { color: '#888', fontSize: 10 },
  overallVal: { color: '#fff', fontSize: 22, fontWeight: '800' },

  statsSection: { padding: 16, gap: 10 },
  statBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statBarLabel: { color: '#888', fontSize: 12, width: 28 },
  statBarBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 4 },
  statBarVal: { fontSize: 12, fontWeight: '700', width: 28, textAlign: 'right' },

  statHint: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', padding: 12 },
  hintText: { color: '#444', fontSize: 11, textAlign: 'center' },

  sectionTitle: { color: '#888', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 4 },

  arenaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141c14', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  arenaLocked: { opacity: 0.5 },
  arenaColorBar: { width: 5, alignSelf: 'stretch' },
  arenaBody: { flex: 1, padding: 14, gap: 10 },
  arenaTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  arenaEmoji: { fontSize: 26, width: 32, textAlign: 'center' },
  arenaInfo: { flex: 1 },
  arenaName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  lockedText: { color: '#444' },
  arenaDesc: { color: '#555', fontSize: 12, marginTop: 2 },

  arenaBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  opponentRow: { flexDirection: 'row', gap: 6 },
  opponentChip: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  opponentEmoji: { fontSize: 16 },
  opponentPower: { color: '#ef4444', fontSize: 10, fontWeight: '700' },

  rewardRow: { alignItems: 'flex-end', gap: 4 },
  rewardText: { color: '#f59e0b', fontSize: 11, fontWeight: '600' },
  lockText: { color: '#ef4444', fontSize: 11 },
  warningText: { color: '#f97316', fontSize: 11 },

  chevron: { marginRight: 12 },
});
