import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getPlayer, savePlayer, getTerritories, saveTerritories, checkAndResetDaily } from '../utils/storage';
import { calcLevel, xpProgress, getLeague, ACHIEVEMENTS, DAILY_MISSIONS, SHIELD_COST, SHIELD_DURATION_MS, buyShield } from '../game/GameEngine';
import ItemShopModal from '../components/ItemShopModal';
import { formatDistance, formatArea, cellsToArea } from '../utils/geo';

const LEADERBOARD = [
  { name: '김서울', cells: 847, league: '💠' },
  { name: '박달리기', cells: 412, league: '💎' },
  { name: '이정복', cells: 298, league: '💎' },
  { name: '최영토', cells: 201, league: '🥇' },
  { name: '정스피드', cells: 175, league: '🥇' },
];

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [player, setPlayer] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [shieldActive, setShieldActive] = useState(false);
  const [showItemShop, setShowItemShop] = useState(false);

  useFocusEffect(useCallback(() => { loadPlayer(); }, []));

  async function loadPlayer() {
    let p = await getPlayer();
    p = checkAndResetDaily(p);
    setPlayer(p);
    const terr = await getTerritories();
    const now = Date.now();
    setShieldActive(Object.values(terr).some((c) => c.shielded && c.shieldExpiry > now));
  }

  async function handleBuyShield() {
    const terr = await getTerritories();
    const result = buyShield(player, terr);
    if (!result) {
      Alert.alert('코인 부족', `쉴드 구매에 ${SHIELD_COST} 코인이 필요해요.\n현재 코인: ${player.coins}`);
      return;
    }
    await savePlayer(result.updatedPlayer);
    await saveTerritories(result.updatedTerritories);
    setPlayer(result.updatedPlayer);
    setShieldActive(true);
    Alert.alert('쉴드 활성화!', '모든 영토에 24시간 쉴드가 적용됐어요. 🛡️');
  }

  async function saveName() {
    if (!nameInput.trim()) return;
    const updated = { ...player, name: nameInput.trim() };
    await savePlayer(updated);
    setPlayer(updated);
    setEditingName(false);
  }

  if (!player) return <View style={styles.container} />;

  const league = getLeague(player.totalCells);
  const xpProg = xpProgress(player.xp);
  const totalArea = cellsToArea(player.totalCells);
  const myLeaderboardEntry = { name: player.name, cells: player.totalCells, league: league.emoji, isMe: true };
  const board = [...LEADERBOARD, myLeaderboardEntry].sort((a, b) => b.cells - a.cells);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <LinearGradient colors={['#0f1f10', '#0d1117']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.avatarArea}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{player.name[0]}</Text>
          </View>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                maxLength={12}
                returnKeyType="done"
                onSubmitEditing={saveName}
              />
              <TouchableOpacity onPress={saveName}>
                <Ionicons name="checkmark-circle" size={26} color="#22d97a" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.nameRow} onPress={() => { setNameInput(player.name); setEditingName(true); }}>
              <Text style={styles.playerName}>{player.name}</Text>
              <Ionicons name="pencil" size={14} color="#555" />
            </TouchableOpacity>
          )}
          <Text style={styles.leagueBadge}>{league.emoji} {league.name} 리그 · Lv.{player.level}</Text>
        </View>

        {/* XP Bar */}
        <View style={styles.xpSection}>
          <View style={styles.xpLabelRow}>
            <Text style={styles.xpLabel}>레벨 {player.level} → {player.level + 1}</Text>
            <Text style={styles.xpVal}>{player.xp} XP</Text>
          </View>
          <View style={styles.xpBg}>
            <View style={[styles.xpFill, { width: `${Math.round(xpProg.percent * 100)}%` }]} />
          </View>
          {xpProg.needed > 0 && (
            <Text style={styles.xpNeeded}>다음 레벨까지 {xpProg.needed - xpProg.current} XP</Text>
          )}
        </View>
      </LinearGradient>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <MiniStat label="총 영토" value={formatArea(totalArea)} color="#22d97a" />
        <MiniStat label="총 거리" value={formatDistance(player.totalDistance)} color="#3b82f6" />
        <MiniStat label="달리기" value={`${player.totalRuns}회`} color="#f59e0b" />
        <MiniStat label="연속" value={`${player.streak}일 🔥`} color="#ef4444" />
      </View>

      {/* Coin / Resources */}
      <View style={styles.resourceCard}>
        <Ionicons name="wallet-outline" size={20} color="#f59e0b" />
        <Text style={styles.coins}>{player.coins.toLocaleString()} 코인</Text>
        <Text style={styles.coinsNote}>영토를 달려서 코인을 모으세요</Text>
      </View>

      {/* Item Shop */}
      <TouchableOpacity style={styles.itemShopBtn} onPress={() => setShowItemShop(true)}>
        <Text style={styles.itemShopBtnText}>⚔️ 아이템 상점 열기</Text>
        <Text style={styles.itemShopSub}>영토 탈환 아이템 구매</Text>
      </TouchableOpacity>

      <ItemShopModal
        visible={showItemShop}
        player={player}
        onClose={() => setShowItemShop(false)}
        onPlayerUpdate={(updated) => setPlayer(updated)}
      />

      {/* Shield Shop */}
      <View style={styles.shieldCard}>
        <View style={styles.shieldInfo}>
          <Text style={styles.shieldTitle}>🛡️ 영토 쉴드</Text>
          <Text style={styles.shieldDesc}>
            {shieldActive
              ? '쉴드 활성화 중 — 영토가 적으로부터 보호됩니다 (24시간)'
              : `모든 영토를 24시간 동안 적 공격으로부터 보호합니다`}
          </Text>
          <Text style={styles.shieldCost}>💰 {SHIELD_COST} 코인</Text>
        </View>
        <TouchableOpacity
          style={[styles.shieldBtn, shieldActive && styles.shieldBtnActive]}
          onPress={handleBuyShield}
          disabled={shieldActive}
        >
          <Text style={styles.shieldBtnText}>{shieldActive ? '활성 중' : '구매'}</Text>
        </TouchableOpacity>
      </View>

      {/* Achievements */}
      <SectionHeader title="업적" sub={`${player.achievements.length} / ${ACHIEVEMENTS.length}`} />
      <View style={styles.achGrid}>
        {ACHIEVEMENTS.map((ach) => {
          const unlocked = player.achievements.includes(ach.id);
          return (
            <View key={ach.id} style={[styles.achCard, unlocked && styles.achUnlocked]}>
              <Text style={styles.achEmoji}>{unlocked ? ach.emoji : '🔒'}</Text>
              <Text style={[styles.achName, !unlocked && styles.locked]}>{ach.name}</Text>
              <Text style={[styles.achDesc, !unlocked && styles.locked]}>{ach.desc}</Text>
              {unlocked && <Text style={styles.achXp}>+{ach.xpReward} XP</Text>}
            </View>
          );
        })}
      </View>

      {/* Leaderboard */}
      <SectionHeader title="지역 리더보드" sub="시뮬레이션" />
      <View style={styles.boardCard}>
        {board.map((entry, i) => (
          <View key={i} style={[styles.boardRow, entry.isMe && styles.boardRowMe, i < board.length - 1 && styles.boardDivider]}>
            <Text style={[styles.boardRank, i === 0 && { color: '#FFD700' }, i === 1 && { color: '#C0C0C0' }, i === 2 && { color: '#CD7F32' }]}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
            </Text>
            <Text style={[styles.boardName, entry.isMe && { color: '#22d97a' }]}>
              {entry.name}{entry.isMe ? ' (나)' : ''}
            </Text>
            <Text style={styles.boardLeague}>{entry.league}</Text>
            <Text style={styles.boardCells}>{entry.cells}칸</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniVal, { color }]}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {sub && <Text style={styles.sectionSub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  header: { padding: 20, paddingBottom: 24 },
  backBtn: { marginBottom: 16 },
  avatarArea: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22d97a', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: '#16a057' },
  avatarText: { color: '#000', fontSize: 30, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  playerName: { color: '#fff', fontSize: 22, fontWeight: '700' },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  nameInput: { color: '#fff', fontSize: 20, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: '#22d97a', paddingVertical: 2, minWidth: 120, textAlign: 'center' },
  leagueBadge: { color: '#888', fontSize: 13 },
  xpSection: { gap: 6 },
  xpLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLabel: { color: '#22d97a', fontSize: 12, fontWeight: '600' },
  xpVal: { color: '#555', fontSize: 12 },
  xpBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: '#22d97a', borderRadius: 4 },
  xpNeeded: { color: '#444', fontSize: 11, textAlign: 'right' },

  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  miniStat: { flex: 1, backgroundColor: '#141c14', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  miniVal: { fontSize: 14, fontWeight: '700' },
  miniLabel: { color: '#555', fontSize: 10, marginTop: 2 },

  resourceCard: { marginHorizontal: 12, marginBottom: 4, backgroundColor: '#141c14', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  coins: { color: '#f59e0b', fontSize: 18, fontWeight: '700', flex: 1 },
  coinsNote: { color: '#555', fontSize: 11 },

  itemShopBtn: { marginHorizontal: 12, marginTop: 8, backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', alignItems: 'center', gap: 4 },
  itemShopBtnText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
  itemShopSub: { color: '#555', fontSize: 12 },
  shieldCard: { marginHorizontal: 12, marginTop: 8, marginBottom: 4, backgroundColor: '#111827', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  shieldInfo: { flex: 1, gap: 4 },
  shieldTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  shieldDesc: { color: '#888', fontSize: 12, lineHeight: 17 },
  shieldCost: { color: '#f59e0b', fontSize: 12, fontWeight: '600', marginTop: 2 },
  shieldBtn: { backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  shieldBtnActive: { backgroundColor: '#1e3a5f' },
  shieldBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionSub: { color: '#555', fontSize: 13 },

  achGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, gap: 8 },
  achCard: { width: '47%', backgroundColor: '#141c14', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginLeft: 4 },
  achUnlocked: { borderColor: 'rgba(34,217,122,0.3)', backgroundColor: '#111d11' },
  achEmoji: { fontSize: 22, marginBottom: 4 },
  achName: { color: '#ccc', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  achDesc: { color: '#555', fontSize: 11 },
  achXp: { color: '#f59e0b', fontSize: 11, marginTop: 4, fontWeight: '600' },
  locked: { color: '#333' },

  boardCard: { marginHorizontal: 12, backgroundColor: '#141c14', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  boardRowMe: { backgroundColor: 'rgba(34,217,122,0.08)' },
  boardDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  boardRank: { width: 28, color: '#555', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  boardName: { flex: 1, color: '#ddd', fontSize: 14, fontWeight: '500' },
  boardLeague: { fontSize: 16 },
  boardCells: { color: '#22d97a', fontSize: 13, fontWeight: '600', minWidth: 40, textAlign: 'right' },
});
