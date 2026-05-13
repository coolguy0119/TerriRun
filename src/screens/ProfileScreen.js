import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getPlayer, savePlayer, getTerritories, saveTerritories, checkAndResetDaily } from '../utils/storage';
import { C, G, hpColor, shadow } from '../theme/pokemon';
import { calcLevel, xpProgress, getLeague, ACHIEVEMENTS, DAILY_MISSIONS, SHIELD_COST, SHIELD_DURATION_MS, buyShield } from '../game/GameEngine';
import { logout } from '../services/authService';
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
      <LinearGradient colors={G.header} style={[styles.header, { paddingTop: insets.top + 16 }]}>

        <View style={styles.avatarArea}>
          <View style={styles.avatar}>
            <LinearGradient colors={G.vibrant} style={styles.avatarInner}>
              <Text style={styles.avatarText}>{player.name[0]}</Text>
            </LinearGradient>
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
            <Text style={[styles.boardName, entry.isMe && { color: C.yellow }]}>
              {entry.name}{entry.isMe ? ' (나)' : ''}
            </Text>
            <Text style={styles.boardLeague}>{entry.league}</Text>
            <Text style={styles.boardCells}>{entry.cells}칸</Text>
          </View>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => {
          if (window?.confirm?.('로그아웃 하시겠어요?')) {
            logout();
          } else if (Platform.OS !== 'web') {
            Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
              { text: '취소', style: 'cancel' },
              { text: '로그아웃', style: 'destructive', onPress: () => logout() },
            ]);
          }
        }}
      >
        <Ionicons name="log-out-outline" size={20} color={C.red} />
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingBottom: 24 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 16, marginTop: 24, backgroundColor: 'rgba(204,0,0,0.1)', borderRadius: 14, paddingVertical: 16, borderWidth: 2, borderColor: 'rgba(204,0,0,0.4)' },
  logoutText: { color: C.red, fontSize: 16, fontWeight: '900' },
  avatarArea: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', marginBottom: 12 },
  avatarInner: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  playerName: { color: C.text, fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  nameInput: { color: C.text, fontSize: 20, fontWeight: '700', borderBottomWidth: 2, borderBottomColor: C.yellow, paddingVertical: 2, minWidth: 120, textAlign: 'center' },
  leagueBadge: { color: C.text2, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  xpSection: { gap: 6 },
  xpLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLabel: { color: C.yellow, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  xpVal: { color: C.text2, fontSize: 12 },
  xpBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  xpFill: { height: '100%', backgroundColor: C.yellow, borderRadius: 5 },
  xpNeeded: { color: C.text3, fontSize: 11, textAlign: 'right' },

  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  miniStat: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 2, borderColor: C.border, ...shadow },
  miniVal: { fontSize: 14, fontWeight: '800' },
  miniLabel: { color: C.text2, fontSize: 10, marginTop: 2, fontWeight: '700', letterSpacing: 0.5 },

  resourceCard: { marginHorizontal: 12, marginBottom: 4, backgroundColor: C.card, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.border, borderLeftWidth: 5, borderLeftColor: C.orange, ...shadow },
  coins: { color: C.yellow, fontSize: 18, fontWeight: '900', flex: 1 },
  coinsNote: { color: C.text3, fontSize: 11 },

  itemShopBtn: { marginHorizontal: 12, marginTop: 8, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 2, borderColor: C.red, alignItems: 'center', gap: 4, ...shadow },
  itemShopBtnText: { color: C.red, fontSize: 16, fontWeight: '900' },
  itemShopSub: { color: C.text3, fontSize: 12 },
  shieldCard: { marginHorizontal: 12, marginTop: 8, marginBottom: 4, backgroundColor: C.card, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: C.border, borderLeftWidth: 5, borderLeftColor: C.blue, ...shadow },
  shieldInfo: { flex: 1, gap: 4 },
  shieldTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  shieldDesc: { color: C.text2, fontSize: 12, lineHeight: 17 },
  shieldCost: { color: C.yellow, fontSize: 12, fontWeight: '700', marginTop: 2 },
  shieldBtn: { backgroundColor: C.blue, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 2, borderColor: '#5a9af0' },
  shieldBtnActive: { backgroundColor: '#1e3a5f', borderColor: C.border },
  shieldBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  sectionTitle: { color: C.yellow, fontSize: 13, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionSub: { color: C.text2, fontSize: 13, fontWeight: '700' },

  achGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, gap: 8 },
  achCard: { width: '47%', backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 2, borderColor: C.border, marginLeft: 4, ...shadow },
  achUnlocked: { borderColor: C.yellow, backgroundColor: 'rgba(255,203,5,0.06)' },
  achEmoji: { fontSize: 22, marginBottom: 4 },
  achName: { color: C.text, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  achDesc: { color: C.text2, fontSize: 11 },
  achXp: { color: C.yellow, fontSize: 11, marginTop: 4, fontWeight: '800' },
  locked: { color: C.text3 },

  boardCard: { marginHorizontal: 12, backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: C.border, overflow: 'hidden', ...shadow },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  boardRowMe: { backgroundColor: 'rgba(255,203,5,0.08)' },
  boardDivider: { borderBottomWidth: 1, borderBottomColor: C.border },
  boardRank: { width: 28, color: C.text2, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  boardName: { flex: 1, color: C.text, fontSize: 14, fontWeight: '600' },
  boardLeague: { fontSize: 16 },
  boardCells: { color: C.yellow, fontSize: 13, fontWeight: '800', minWidth: 40, textAlign: 'right' },
});
