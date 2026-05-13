import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getPlayer, savePlayer, getEnemies, saveEnemies, getTerritories } from '../utils/storage';
import {
  ENEMY_ALLIANCES, BATTLE_GAMES, ATTACK_COST, DEFEND_COST,
  createAlliance, canAttack, doAttack,
} from '../game/AllianceEngine';

const ALLIANCE_COLORS = ['#ef4444', '#3b82f6', '#A78BFA', '#f59e0b', '#8b5cf6', '#ec4899'];

// Mock alliance member list generated per alliance tag
function getMockMembers(tag, color) {
  const names = ['달리기왕', '영토정복', '스피드킹', '러너123', '캡처마스터'];
  return names.map((name, i) => ({
    name: `${name}_${tag}`,
    cells: Math.floor(Math.random() * 200 + 50),
    level: Math.floor(Math.random() * 15 + 3),
    color,
  }));
}

// Alliance weekly mission definitions
const ALLIANCE_MISSIONS = [
  { id: 'earn_200bp', name: 'BP 200 획득', desc: '이번 주 전투 포인트 200 이상 획득', target: 200, field: 'battlePoints', emoji: '⚡' },
  { id: 'win_3',      name: '3회 공격 성공', desc: '적 연맹을 3회 이상 공격',           target: 3,   field: 'wins',         emoji: '⚔️' },
];

export default function AllianceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [player, setPlayer]             = useState(null);
  const [allianceCells, setAllianceCells] = useState(0);
  const [showCreate, setShowCreate]     = useState(false);
  const [allianceName, setAllianceName] = useState('');
  const [allianceTag, setAllianceTag]   = useState('');
  const [selectedColor, setSelectedColor] = useState(ALLIANCE_COLORS[0]);
  const [showMembers, setShowMembers]   = useState(false);
  const [mockMembers, setMockMembers]   = useState([]);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const p = await getPlayer();
    setPlayer(p);
    const terr = await getTerritories();
    setAllianceCells(Object.values(terr).filter((c) => c.owner === 'player').length);
  }

  async function handleCreate() {
    if (!allianceName.trim() || !allianceTag.trim()) {
      Alert.alert('입력 필요', '연맹 이름과 태그를 입력해 주세요.');
      return;
    }
    const alliance = createAlliance(allianceName, allianceTag, selectedColor);
    const updated = { ...player, alliance };
    await savePlayer(updated);
    setPlayer(updated);
    setShowCreate(false);
    setAllianceName('');
    setAllianceTag('');
  }

  async function handleJoin(target) {
    Alert.alert(
      `${target.name} 가입`,
      `이 연맹에 가입하시겠어요?\n영토 ${target.cells}칸 · ${target.wins}승`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '가입',
          onPress: async () => {
            const alliance = createAlliance(target.name, target.tag, target.color);
            const updated = { ...player, alliance };
            await savePlayer(updated);
            setPlayer(updated);
          },
        },
      ]
    );
  }

  async function handleAttack(target) {
    if (!canAttack(player.alliance)) {
      Alert.alert('BP 부족', `공격에 ${ATTACK_COST} BP가 필요해요.\n현재: ${player.alliance.battlePoints} BP\n\n미니게임으로 BP를 모으세요!`);
      return;
    }
    Alert.alert(
      `${target.name} 공격`,
      `${ATTACK_COST} BP를 사용해 적 영토 10칸을 제거합니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '공격!',
          onPress: async () => {
            const enemies = await getEnemies() || {};
            const result = doAttack(player.alliance, target.id, enemies);
            if (!result) return;
            const updated = { ...player, alliance: result.updatedAlliance };
            await savePlayer(updated);
            await saveEnemies(result.updatedEnemies);
            setPlayer(updated);
            Alert.alert('공격 성공! ⚔️', `적 영토 ${result.removedCount}칸 제거!\n총 승리: ${result.updatedAlliance.wins}회`);
          },
        },
      ]
    );
  }

  async function handleDefend() {
    if (!player.alliance || player.alliance.battlePoints < DEFEND_COST) {
      Alert.alert('BP 부족', `방어 강화에 ${DEFEND_COST} BP가 필요해요.\n현재: ${player.alliance?.battlePoints ?? 0} BP`);
      return;
    }
    Alert.alert(
      '방어 강화',
      `${DEFEND_COST} BP를 사용해 내 영토 5칸의 체력을 회복합니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '강화!',
          onPress: async () => {
            const updatedAlliance = {
              ...player.alliance,
              battlePoints: player.alliance.battlePoints - DEFEND_COST,
            };
            const updated = { ...player, alliance: updatedAlliance };
            await savePlayer(updated);
            setPlayer(updated);
            Alert.alert('방어 강화 완료! 🛡️', '연맹 영토의 방어력이 강화됐어요.');
          },
        },
      ]
    );
  }

  function openMembers() {
    if (!player?.alliance) return;
    setMockMembers(getMockMembers(player.alliance.tag, player.alliance.color));
    setShowMembers(true);
  }

  if (!player) return <View style={styles.container} />;

  const alliance = player.alliance;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient colors={['#150B35', '#0A0818']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>⚔️ 연맹</Text>
        {alliance && (
          <View style={[styles.myAllianceBadge, { borderColor: alliance.color }]}>
            <Text style={[styles.myTag, { color: alliance.color }]}>[{alliance.tag}]</Text>
            <Text style={styles.myName}>{alliance.name}</Text>
            <Text style={styles.myWins}>🏆 {alliance.wins}승</Text>
          </View>
        )}
      </LinearGradient>

      {!alliance ? (
        /* ── No Alliance ── */
        <View style={styles.noAllianceArea}>
          <Text style={styles.noAllianceText}>연맹에 가입하거나 새로 만드세요</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.createBtnText}>+ 새 연맹 만들기</Text>
          </TouchableOpacity>
          <Text style={styles.sectionLabel}>기존 연맹 가입</Text>
          {ENEMY_ALLIANCES.map((a) => (
            <View key={a.id} style={[styles.allianceCard, { borderColor: a.color + '44' }]}>
              <View style={[styles.allianceTag, { backgroundColor: a.color + '22' }]}>
                <Text style={[styles.tagText, { color: a.color }]}>{a.tag}</Text>
              </View>
              <View style={styles.allianceInfo}>
                <Text style={styles.allianceName}>{a.name}</Text>
                <Text style={styles.allianceDesc}>{a.desc}</Text>
                <Text style={styles.allianceStats}>영토 {a.cells}칸 · {a.wins}승</Text>
              </View>
              <TouchableOpacity style={[styles.joinBtn, { backgroundColor: a.color }]} onPress={() => handleJoin(a)}>
                <Text style={styles.joinBtnText}>가입</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <>
          {/* ── Alliance Stats ── */}
          <View style={styles.allianceStatsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{allianceCells}</Text>
              <Text style={styles.statLabel}>연맹 영토</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: '#8b5cf6' }]}>{alliance.battlePoints}</Text>
              <Text style={styles.statLabel}>전투 포인트</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: '#f59e0b' }]}>{alliance.wins}</Text>
              <Text style={styles.statLabel}>총 승리</Text>
            </View>
          </View>

          {/* ── BP Bar ── */}
          <View style={styles.bpCard}>
            <View style={styles.bpHeader}>
              <Text style={styles.bpLabel}>전투 포인트 (BP)</Text>
              <TouchableOpacity style={styles.membersBtn} onPress={openMembers}>
                <Ionicons name="people-outline" size={16} color="#8b5cf6" />
                <Text style={styles.membersBtnText}>멤버 보기</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.bpValue}>{alliance.battlePoints}</Text>
            <View style={styles.bpBar}>
              <View style={[styles.bpFill, { width: `${Math.min(100, alliance.battlePoints)}%` }]} />
            </View>
            <Text style={styles.bpHint}>공격 {ATTACK_COST} BP · 방어 {DEFEND_COST} BP</Text>
          </View>

          {/* ── Weekly Missions ── */}
          <Text style={styles.sectionLabel}>📋 주간 연맹 미션</Text>
          <View style={styles.missionsCard}>
            {ALLIANCE_MISSIONS.map((m) => {
              const current = m.field === 'battlePoints' ? alliance.battlePoints : alliance.wins;
              const pct = Math.min(current / m.target, 1);
              const done = pct >= 1;
              return (
                <View key={m.id} style={[styles.missionRow, done && styles.missionDone]}>
                  <Text style={styles.missionEmoji}>{m.emoji}</Text>
                  <View style={styles.missionInfo}>
                    <Text style={styles.missionName}>{m.name}</Text>
                    <Text style={styles.missionDesc}>{m.desc}</Text>
                    <View style={styles.missionBar}>
                      <View style={[styles.missionFill, { width: `${Math.round(pct * 100)}%` }, done && styles.missionFillDone]} />
                    </View>
                    <Text style={styles.missionProgress}>{Math.min(current, m.target)} / {m.target}</Text>
                  </View>
                  {done && <Text style={styles.missionCheck}>✅</Text>}
                </View>
              );
            })}
          </View>

          {/* ── Battle Games ── */}
          <Text style={styles.sectionLabel}>⚔️ 연맹 전투 미니게임</Text>
          {BATTLE_GAMES.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={styles.gameCard}
              onPress={() => navigation.navigate('Battle', { gameId: game.id })}
            >
              <Text style={styles.gameEmoji}>{game.emoji}</Text>
              <View style={styles.gameInfo}>
                <Text style={styles.gameName}>{game.name}</Text>
                <Text style={styles.gameDesc}>{game.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#555" />
            </TouchableOpacity>
          ))}

          {/* ── Enemy Alliances ── */}
          <Text style={styles.sectionLabel}>🏴 적 연맹 공격</Text>
          {ENEMY_ALLIANCES.map((a) => {
            const attacked = alliance.attackedAlliances?.[a.id] || 0;
            return (
              <View key={a.id} style={[styles.allianceCard, { borderColor: a.color + '44' }]}>
                <View style={[styles.allianceTag, { backgroundColor: a.color + '22' }]}>
                  <Text style={[styles.tagText, { color: a.color }]}>{a.tag}</Text>
                </View>
                <View style={styles.allianceInfo}>
                  <Text style={styles.allianceName}>{a.name}</Text>
                  <Text style={styles.allianceStats}>영토 {Math.max(0, a.cells - attacked * 10)}칸 · {a.wins}승</Text>
                  {attacked > 0 && <Text style={styles.attackedNote}>내가 {attacked}회 공격 ({attacked * 10}칸 제거)</Text>}
                </View>
                <View style={styles.actionBtns}>
                  <TouchableOpacity
                    style={[styles.attackBtn, !canAttack(alliance) && styles.attackBtnDisabled]}
                    onPress={() => handleAttack(a)}
                  >
                    <Text style={styles.attackBtnText}>⚔️ 공격</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* ── Defend Button ── */}
          <TouchableOpacity
            style={[styles.defendBtn, alliance.battlePoints < DEFEND_COST && styles.defendBtnDisabled]}
            onPress={handleDefend}
          >
            <Ionicons name="shield-outline" size={18} color={alliance.battlePoints >= DEFEND_COST ? '#3b82f6' : '#333'} />
            <Text style={[styles.defendBtnText, alliance.battlePoints < DEFEND_COST && { color: '#333' }]}>
              방어 강화 ({DEFEND_COST} BP)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.leaveBtn} onPress={() => {
            Alert.alert('연맹 탈퇴', '정말 탈퇴하시겠어요?', [
              { text: '취소', style: 'cancel' },
              { text: '탈퇴', style: 'destructive', onPress: async () => {
                const updated = { ...player, alliance: null };
                await savePlayer(updated);
                setPlayer(updated);
              }},
            ]);
          }}>
            <Text style={styles.leaveBtnText}>연맹 탈퇴</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Create Alliance Modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>새 연맹 만들기</Text>
            <TextInput style={styles.input} placeholder="연맹 이름" placeholderTextColor="#555" value={allianceName} onChangeText={setAllianceName} maxLength={16} />
            <TextInput style={styles.input} placeholder="태그 (2~4자)" placeholderTextColor="#555" value={allianceTag} onChangeText={setAllianceTag} maxLength={4} autoCapitalize="characters" />
            <Text style={styles.colorLabel}>색상 선택</Text>
            <View style={styles.colorRow}>
              {ALLIANCE_COLORS.map((c) => (
                <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]} onPress={() => setSelectedColor(c)} />
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreate}>
                <Text style={styles.confirmText}>만들기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Members Modal */}
      <Modal visible={showMembers} animationType="slide" transparent onRequestClose={() => setShowMembers(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>연맹 멤버</Text>
            {[{ name: player.name, cells: allianceCells, level: player.level, isMe: true }, ...mockMembers]
              .sort((a, b) => b.cells - a.cells)
              .map((m, i) => (
                <View key={i} style={styles.memberRow}>
                  <Text style={styles.memberRank}>{i + 1}</Text>
                  <View style={[styles.memberAvatar, { backgroundColor: alliance?.color ?? '#A78BFA' }]}>
                    <Text style={styles.memberAvatarText}>{m.name[0]}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, m.isMe && { color: '#A78BFA' }]}>
                      {m.name}{m.isMe ? ' (나)' : ''}
                    </Text>
                    <Text style={styles.memberStats}>Lv.{m.level} · 영토 {m.cells}칸</Text>
                  </View>
                </View>
              ))
            }
            <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowMembers(false)}>
              <Text style={styles.confirmText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0818' },
  header: { padding: 20, paddingBottom: 24, alignItems: 'center', gap: 12 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  myAllianceBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  myTag: { fontWeight: '800', fontSize: 14 },
  myName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  myWins: { color: '#f59e0b', fontSize: 13 },

  noAllianceArea: { padding: 16, gap: 12 },
  noAllianceText: { color: '#888', textAlign: 'center', fontSize: 14, marginTop: 8 },
  createBtn: { backgroundColor: '#8b5cf6', borderRadius: 14, padding: 16, alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionLabel: { color: '#888', fontSize: 13, fontWeight: '600', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  allianceStatsCard: { margin: 16, backgroundColor: '#1a0a2e', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { color: '#A78BFA', fontSize: 26, fontWeight: '800' },
  statLabel: { color: '#666', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },

  bpCard: { marginHorizontal: 16, marginBottom: 4, backgroundColor: '#1a0a2e', borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  bpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bpLabel: { color: '#888', fontSize: 13, fontWeight: '600' },
  membersBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  membersBtnText: { color: '#8b5cf6', fontSize: 12, fontWeight: '600' },
  bpValue: { color: '#8b5cf6', fontSize: 36, fontWeight: '800' },
  bpBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  bpFill: { height: '100%', backgroundColor: '#8b5cf6', borderRadius: 4 },
  bpHint: { color: '#555', fontSize: 11 },

  missionsCard: { marginHorizontal: 16, marginBottom: 4, backgroundColor: '#130D2A', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  missionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  missionDone: { backgroundColor: 'rgba(34,217,122,0.05)' },
  missionEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  missionInfo: { flex: 1, gap: 4 },
  missionName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  missionDesc: { color: '#666', fontSize: 11 },
  missionBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  missionFill: { height: '100%', backgroundColor: '#8b5cf6', borderRadius: 2 },
  missionFillDone: { backgroundColor: '#A78BFA' },
  missionProgress: { color: '#555', fontSize: 10 },
  missionCheck: { fontSize: 18 },

  gameCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#130D2A', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
  gameEmoji: { fontSize: 30, width: 40, textAlign: 'center' },
  gameInfo: { flex: 1 },
  gameName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  gameDesc: { color: '#666', fontSize: 12, marginTop: 2 },

  allianceCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#130D2A', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  allianceTag: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tagText: { fontSize: 13, fontWeight: '800' },
  allianceInfo: { flex: 1 },
  allianceName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  allianceDesc: { color: '#666', fontSize: 11, marginTop: 2 },
  allianceStats: { color: '#888', fontSize: 11, marginTop: 2 },
  attackedNote: { color: '#A78BFA', fontSize: 11, marginTop: 2 },
  joinBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  joinBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  actionBtns: { gap: 6 },
  attackBtn: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  attackBtnDisabled: { backgroundColor: '#2a1a1a' },
  attackBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  defendBtn: { marginHorizontal: 16, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(59,130,246,0.12)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  defendBtnDisabled: { borderColor: '#1a1a1a', backgroundColor: 'rgba(255,255,255,0.03)' },
  defendBtnText: { color: '#3b82f6', fontSize: 14, fontWeight: '700' },

  leaveBtn: { margin: 16, padding: 14, alignItems: 'center' },
  leaveBtnText: { color: '#ef4444', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14, maxHeight: '80%' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  input: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#333' },
  colorLabel: { color: '#888', fontSize: 13 },
  colorRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff' },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelText: { color: '#888', fontSize: 16 },
  confirmBtn: { flex: 1, backgroundColor: '#8b5cf6', borderRadius: 12, padding: 14, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  memberRank: { color: '#555', fontSize: 14, fontWeight: '700', width: 20, textAlign: 'center' },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: '#000', fontSize: 16, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  memberStats: { color: '#666', fontSize: 12 },
});
