import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getPlayer, savePlayer, getEnemies, saveEnemies } from '../utils/storage';
import { ENEMY_ALLIANCES, BATTLE_GAMES, ATTACK_COST, DEFEND_COST, createAlliance, canAttack, doAttack } from '../game/AllianceEngine';
import { C } from '../theme/pokemon';

const ALLIANCE_COLORS = ['#CC0000', '#3D7DCA', '#4CAF50', '#FFCB05', '#A040A0', '#F08030'];

export default function AllianceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [player, setPlayer] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [allianceName, setAllianceName] = useState('');
  const [allianceTag, setAllianceTag] = useState('');
  const [selectedColor, setSelectedColor] = useState(ALLIANCE_COLORS[0]);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const p = await getPlayer();
    setPlayer(p);
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
      '이 연맹에 가입하시겠어요?',
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
            Alert.alert('공격 성공! ⚔️', `적 영토 ${result.removedCount}칸 제거!\n승리 횟수: ${result.updatedAlliance.wins}`);
          },
        },
      ]
    );
  }

  if (!player) return <View style={styles.container} />;

  const alliance = player.alliance;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient colors={['#0a0f2a', '#1a1a2e']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
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
        /* ── Has Alliance ── */
        <>
          {/* BP Status */}
          <View style={styles.bpCard}>
            <Text style={styles.bpLabel}>전투 포인트 (BP)</Text>
            <Text style={styles.bpValue}>{alliance.battlePoints}</Text>
            <View style={styles.bpBar}>
              <View style={[styles.bpFill, { width: `${Math.min(100, alliance.battlePoints)}%` }]} />
            </View>
            <Text style={styles.bpHint}>{ATTACK_COST} BP = 적 영토 10칸 제거</Text>
          </View>

          {/* Battle Games */}
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

          {/* Enemy Alliances */}
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
                <TouchableOpacity
                  style={[styles.attackBtn, !canAttack(alliance) && styles.attackBtnDisabled]}
                  onPress={() => handleAttack(a)}
                >
                  <Text style={styles.attackBtnText}>⚔️ 공격</Text>
                </TouchableOpacity>
              </View>
            );
          })}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingBottom: 24, alignItems: 'center', gap: 12 },
  headerTitle: { color: C.yellow, fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  myAllianceBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  myTag: { fontWeight: '900', fontSize: 14 },
  myName: { color: C.text, fontSize: 15, fontWeight: '700' },
  myWins: { color: C.yellow, fontSize: 13, fontWeight: '700' },

  noAllianceArea: { padding: 16, gap: 12 },
  noAllianceText: { color: C.text3, textAlign: 'center', fontSize: 14, marginTop: 8 },
  createBtn: { backgroundColor: C.purple, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(160,64,160,0.5)' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sectionLabel: { color: C.yellow, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  bpCard: { margin: 16, backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 8, borderWidth: 2, borderColor: 'rgba(160,64,160,0.4)' },
  bpLabel: { color: C.text2, fontSize: 13, fontWeight: '700' },
  bpValue: { color: C.purple, fontSize: 36, fontWeight: '900' },
  bpBar: { height: 10, backgroundColor: C.border, borderRadius: 5, overflow: 'hidden' },
  bpFill: { height: '100%', backgroundColor: C.purple, borderRadius: 5 },
  bpHint: { color: C.text3, fontSize: 11 },

  gameCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: C.card, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: C.border },
  gameEmoji: { fontSize: 30, width: 40, textAlign: 'center' },
  gameInfo: { flex: 1 },
  gameName: { color: C.text, fontSize: 15, fontWeight: '800' },
  gameDesc: { color: C.text3, fontSize: 12, marginTop: 2 },

  allianceCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: C.card, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2 },
  allianceTag: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tagText: { fontSize: 13, fontWeight: '900' },
  allianceInfo: { flex: 1 },
  allianceName: { color: C.text, fontSize: 14, fontWeight: '800' },
  allianceDesc: { color: C.text3, fontSize: 11, marginTop: 2 },
  allianceStats: { color: C.text2, fontSize: 11, marginTop: 2 },
  attackedNote: { color: C.green, fontSize: 11, marginTop: 2, fontWeight: '700' },
  joinBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  joinBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  attackBtn: { backgroundColor: C.red, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: 'rgba(204,0,0,0.5)' },
  attackBtnDisabled: { backgroundColor: C.card2, borderColor: C.border },
  attackBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  leaveBtn: { margin: 16, padding: 14, alignItems: 'center' },
  leaveBtnText: { color: C.red, fontSize: 14, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14, borderTopWidth: 2, borderTopColor: C.yellow },
  modalTitle: { color: C.yellow, fontSize: 20, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
  input: { backgroundColor: C.bg, borderRadius: 12, padding: 14, color: C.text, fontSize: 16, borderWidth: 2, borderColor: C.border },
  colorLabel: { color: C.text2, fontSize: 13, fontWeight: '700' },
  colorRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: C.yellow },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: C.bg, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: C.border },
  cancelText: { color: C.text2, fontSize: 16, fontWeight: '700' },
  confirmBtn: { flex: 1, backgroundColor: C.purple, borderRadius: 12, padding: 14, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
