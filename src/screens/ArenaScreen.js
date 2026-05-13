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
import { C } from '../theme/pokemon';

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
      <LinearGradient colors={['#0a0f2a', '#1a1a2e']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.yellow} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🏟️ 러닝 아레나</Text>
          <Text style={styles.headerSub}>달리기 기록으로 캐릭터가 강해집니다</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* My Character Card */}
        <View style={styles.charCard}>
          <LinearGradient colors={['#0f1a3a', '#16213e']} style={styles.charCardInner}>
            <Text style={styles.charEmoji}>{charEmoji}</Text>
            <View style={styles.charInfo}>
              <Text style={styles.charName}>{player.name}</Text>
              <Text style={styles.charLevel}>Lv.{player.level} 트레이너</Text>
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
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 14, gap: 12 },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { color: C.yellow, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  headerSub: { color: C.text2, fontSize: 12, marginTop: 2 },

  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  charCard: { backgroundColor: C.card, borderRadius: 18, borderWidth: 2, borderColor: C.border, overflow: 'hidden', marginBottom: 4 },
  charCardInner: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  charEmoji: { fontSize: 48 },
  charInfo: { flex: 1 },
  charName: { color: C.text, fontSize: 18, fontWeight: '900' },
  charLevel: { color: C.yellow, fontSize: 13, marginTop: 2, fontWeight: '700' },
  overallBadge: { alignItems: 'center', backgroundColor: 'rgba(255,203,5,0.1)', borderRadius: 12, padding: 10, borderWidth: 2, borderColor: 'rgba(255,203,5,0.3)' },
  overallLabel: { color: C.text3, fontSize: 10, fontWeight: '700' },
  overallVal: { color: C.yellow, fontSize: 22, fontWeight: '900' },

  statsSection: { padding: 16, gap: 10 },
  statBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statBarLabel: { color: C.text2, fontSize: 12, width: 28, fontWeight: '700' },
  statBarBg: { flex: 1, height: 10, backgroundColor: C.border, borderRadius: 5, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 5 },
  statBarVal: { fontSize: 12, fontWeight: '800', width: 28, textAlign: 'right' },

  statHint: { borderTopWidth: 2, borderTopColor: C.border, padding: 12 },
  hintText: { color: C.text3, fontSize: 11, textAlign: 'center' },

  sectionTitle: { color: C.yellow, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 },

  arenaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.border, overflow: 'hidden' },
  arenaLocked: { opacity: 0.4 },
  arenaColorBar: { width: 6, alignSelf: 'stretch' },
  arenaBody: { flex: 1, padding: 14, gap: 10 },
  arenaTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  arenaEmoji: { fontSize: 26, width: 32, textAlign: 'center' },
  arenaInfo: { flex: 1 },
  arenaName: { color: C.text, fontSize: 15, fontWeight: '800' },
  lockedText: { color: C.text3 },
  arenaDesc: { color: C.text3, fontSize: 12, marginTop: 2 },

  arenaBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  opponentRow: { flexDirection: 'row', gap: 6 },
  opponentChip: { alignItems: 'center', backgroundColor: C.card2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.border },
  opponentEmoji: { fontSize: 16 },
  opponentPower: { color: C.red, fontSize: 10, fontWeight: '800' },

  rewardRow: { alignItems: 'flex-end', gap: 4 },
  rewardText: { color: C.yellow, fontSize: 11, fontWeight: '700' },
  lockText: { color: C.red, fontSize: 11, fontWeight: '700' },
  warningText: { color: C.orange, fontSize: 11, fontWeight: '700' },

  chevron: { marginRight: 12 },
});
