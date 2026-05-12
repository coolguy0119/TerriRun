import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { formatDistance, formatDuration, formatPace } from '../utils/geo';

export default function RunResultModal({ data, onClose, onShield }) {
  const {
    distance, duration, cells, enemyCells,
    xpGain, coinGain, newAchievements, newlyCompleted,
    leveledUp, newLevel, playerCoins,
  } = data;

  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const pace = distance > 0 && duration > 0 ? duration / distance * 1000 : 0;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={['#0f1f10', '#0d1117']} style={styles.header}>
          <Text style={styles.title}>달리기 완료! 🎉</Text>
          {leveledUp && (
            <View style={styles.levelUpBadge}>
              <Text style={styles.levelUpText}>⭐ 레벨 업! Lv.{newLevel}</Text>
            </View>
          )}
        </LinearGradient>

        <ScrollView style={styles.body} contentContainerStyle={{ padding: 20, gap: 12 }}>
          {/* Main stats */}
          <View style={styles.statsRow}>
            <BigStat label="거리" value={formatDistance(distance)} color="#22d97a" icon="walk" />
            <BigStat label="시간" value={formatDuration(duration)} color="#3b82f6" icon="time" />
            <BigStat label="페이스" value={formatPace(distance / duration)} color="#f59e0b" icon="speedometer" />
          </View>

          {/* Territory row */}
          <View style={styles.terrRow}>
            <View style={styles.terrStat}>
              <Text style={styles.terrVal}>{cells}</Text>
              <Text style={styles.terrLabel}>새 영토 (칸)</Text>
            </View>
            {enemyCells > 0 && (
              <View style={styles.terrStat}>
                <Text style={[styles.terrVal, { color: '#ef4444' }]}>{enemyCells}</Text>
                <Text style={styles.terrLabel}>⚔️ 적 영토 탈환</Text>
              </View>
            )}
          </View>

          {/* XP & Coins gained */}
          <View style={styles.rewardRow}>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardValue}>+{xpGain}</Text>
              <Text style={styles.rewardLabel}>XP 획득</Text>
            </View>
            <View style={styles.rewardDivider} />
            <View style={styles.rewardItem}>
              <Text style={[styles.rewardValue, { color: '#f59e0b' }]}>+{coinGain}</Text>
              <Text style={styles.rewardLabel}>🪙 코인</Text>
            </View>
          </View>

          {/* Mission completions */}
          {newlyCompleted.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 미션 완료!</Text>
              {newlyCompleted.map((m) => (
                <View key={m.id} style={styles.missionRow}>
                  <Text style={styles.missionEmoji}>{m.emoji}</Text>
                  <Text style={styles.missionName}>{m.name}</Text>
                  <Text style={styles.missionReward}>+{m.xpReward}XP</Text>
                </View>
              ))}
            </View>
          )}

          {/* New achievements */}
          {newAchievements.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏅 업적 해제!</Text>
              {newAchievements.map((a) => (
                <View key={a.id} style={styles.achRow}>
                  <Text style={styles.achEmoji}>{a.emoji}</Text>
                  <View>
                    <Text style={styles.achName}>{a.name}</Text>
                    <Text style={styles.achDesc}>{a.desc}</Text>
                  </View>
                  <Text style={styles.achXp}>+{a.xpReward}XP</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* CTA */}
        <View style={styles.footer}>
          {onShield && (
            <TouchableOpacity style={styles.shieldBtn} onPress={onShield} activeOpacity={0.85}>
              <Text style={styles.shieldBtnText}>🛡️ 영토 쉴드 구매 (100코인)</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <LinearGradient colors={['#22d97a', '#16a057']} style={styles.closeBtnGrad}>
              <Text style={styles.closeBtnText}>확인</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function BigStat({ label, value, color, icon }) {
  return (
    <View style={styles.bigStat}>
      <Ionicons name={icon + '-outline'} size={18} color={color} />
      <Text style={[styles.bigStatVal, { color }]}>{value}</Text>
      <Text style={styles.bigStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', zIndex: 99 },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', overflow: 'hidden' },
  header: { padding: 24, alignItems: 'center', gap: 8 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  levelUpBadge: { backgroundColor: 'rgba(245,158,11,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  levelUpText: { color: '#f59e0b', fontWeight: '600' },
  body: { maxHeight: 420 },
  statsRow: { flexDirection: 'row', gap: 8 },
  bigStat: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
  bigStatVal: { fontSize: 18, fontWeight: '700' },
  bigStatLabel: { color: '#555', fontSize: 11 },
  terrRow: { flexDirection: 'row', gap: 8 },
  terrStat: { flex: 1, backgroundColor: 'rgba(34,217,122,0.08)', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,217,122,0.2)' },
  terrVal: { color: '#22d97a', fontSize: 28, fontWeight: '700' },
  terrLabel: { color: '#555', fontSize: 12 },
  rewardRow: { backgroundColor: '#1a1a1a', borderRadius: 12, flexDirection: 'row', overflow: 'hidden' },
  rewardItem: { flex: 1, padding: 16, alignItems: 'center' },
  rewardDivider: { width: 1, backgroundColor: '#222', marginVertical: 12 },
  rewardValue: { color: '#22d97a', fontSize: 24, fontWeight: '700' },
  rewardLabel: { color: '#555', fontSize: 12, marginTop: 2 },
  section: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, gap: 10 },
  sectionTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  missionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  missionEmoji: { fontSize: 18 },
  missionName: { color: '#ccc', fontSize: 13, flex: 1 },
  missionReward: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },
  achRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  achEmoji: { fontSize: 22 },
  achName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  achDesc: { color: '#555', fontSize: 11 },
  achXp: { color: '#f59e0b', fontSize: 12, fontWeight: '600', marginLeft: 'auto' },
  footer: { padding: 16, paddingBottom: 32, gap: 10 },
  shieldBtn: { backgroundColor: '#1e3a5f', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59,130,246,0.5)' },
  shieldBtnText: { color: '#3b82f6', fontSize: 15, fontWeight: '700' },
  closeBtn: { borderRadius: 16, overflow: 'hidden' },
  closeBtnGrad: { padding: 16, alignItems: 'center' },
  closeBtnText: { color: '#000', fontSize: 17, fontWeight: '700' },
});
