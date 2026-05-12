import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getPlayer } from '../utils/storage';
import { TRACKS } from '../game/GameEngine';
import { formatDistance } from '../utils/geo';
import { C } from '../theme/pokemon';

function formatBonus(xp, coin) {
  return `+${xp}XP  +${coin}🪙`;
}

export default function TrackListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [player, setPlayer] = useState(null);

  useFocusEffect(
    useCallback(() => {
      getPlayer().then(setPlayer);
    }, [])
  );

  if (!player) return <View style={styles.container} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0a0f2a', '#1a1a2e']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.yellow} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🏟️ 러닝 트랙</Text>
          <Text style={styles.headerSub}>레벨 {player.level} — 거리 목표 달성 시 보너스 획득</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.list}>
        {TRACKS.map((track) => {
          const unlocked = player.level >= track.requiredLevel;
          return (
            <TouchableOpacity
              key={track.id}
              style={[styles.card, !unlocked && styles.cardLocked]}
              activeOpacity={unlocked ? 0.82 : 1}
              onPress={() => {
                if (unlocked) navigation.navigate('TrackRun', { track });
              }}
            >
              {/* Left color bar */}
              <View style={[styles.colorBar, { backgroundColor: unlocked ? track.color : '#333' }]} />

              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.trackEmoji}>{unlocked ? track.emoji : '🔒'}</Text>
                  <View style={styles.trackInfo}>
                    <Text style={[styles.trackName, !unlocked && styles.lockedText]}>{track.name}</Text>
                    <Text style={styles.trackDesc}>{track.desc}</Text>
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <View style={styles.pill}>
                    <Ionicons name="walk-outline" size={12} color="#888" />
                    <Text style={styles.pillText}>{formatDistance(track.goalMeters)}</Text>
                  </View>
                  <View style={styles.pill}>
                    <Ionicons name="star-outline" size={12} color="#888" />
                    <Text style={styles.pillText}>{formatBonus(track.xpBonus, track.coinBonus)}</Text>
                  </View>
                  {!unlocked && (
                    <View style={[styles.pill, styles.pillLock]}>
                      <Ionicons name="lock-closed-outline" size={12} color="#ef4444" />
                      <Text style={[styles.pillText, { color: '#ef4444' }]}>레벨 {track.requiredLevel} 필요</Text>
                    </View>
                  )}
                </View>
              </View>

              {unlocked && (
                <Ionicons name="chevron-forward" size={18} color="#444" style={styles.chevron} />
              )}
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

  list: { padding: 16, gap: 12 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.border, overflow: 'hidden' },
  cardLocked: { borderColor: C.border, opacity: 0.5 },
  colorBar: { width: 6, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trackEmoji: { fontSize: 28, width: 34, textAlign: 'center' },
  trackInfo: { flex: 1 },
  trackName: { color: C.text, fontSize: 15, fontWeight: '800' },
  lockedText: { color: C.text3 },
  trackDesc: { color: C.text3, fontSize: 12, marginTop: 2 },

  cardBottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.card2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.border },
  pillLock: { backgroundColor: 'rgba(204,0,0,0.08)', borderColor: 'rgba(204,0,0,0.3)' },
  pillText: { color: C.text2, fontSize: 11, fontWeight: '700' },

  chevron: { marginRight: 12 },
});
