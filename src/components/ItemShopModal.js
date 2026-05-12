import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ITEMS, purchaseItem } from '../game/GameEngine';
import { savePlayer, getTerritories, saveEnemies, getEnemies } from '../utils/storage';
import { generateEnemyCells } from '../utils/geo';

export default function ItemShopModal({ visible, player, onClose, onPlayerUpdate }) {
  async function handleBuy(item) {
    if (!player) return;
    if (item.id === 'spy') {
      // Instant item: generate enemies now
      if (player.coins < item.cost) {
        Alert.alert('코인 부족', `${item.cost} 코인이 필요해요. 현재: ${player.coins}`);
        return;
      }
      const updated = { ...player, coins: player.coins - item.cost };
      const existing = await getEnemies() || {};
      if (!player.lastLat) {
        Alert.alert('위치 없음', '달리기를 한 번 시작해야 위치 정보가 생겨요.');
        return;
      }
      const newCells = generateEnemyCells(player.lastLat, player.lastLng, 50);
      const merged = { ...existing };
      newCells.forEach((c) => { if (!merged[c.key]) merged[c.key] = c; });
      await saveEnemies(merged);
      await savePlayer(updated);
      onPlayerUpdate(updated);
      Alert.alert('정찰대 출동!', '주변에 적 영토 50개가 생성됐어요. 달려서 탈환하세요! 🕵️');
      return;
    }

    const result = purchaseItem(player, item.id);
    if (!result) {
      Alert.alert('코인 부족', `${item.cost} 코인이 필요해요. 현재: ${player.coins}`);
      return;
    }
    await savePlayer(result);
    onPlayerUpdate(result);
    Alert.alert('구매 완료!', `${item.emoji} ${item.name}이(가) 인벤토리에 추가됐어요.\n달리기 시작 전에 활성화하세요.`);
  }

  if (!player) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <LinearGradient colors={['#0f1f10', '#0d1117']} style={styles.header}>
            <Text style={styles.title}>⚔️ 아이템 상점</Text>
            <Text style={styles.coins}>💰 {player.coins.toLocaleString()} 코인</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#888" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.list}>
            {ITEMS.map((item) => {
              const owned = player.inventory?.[item.id] || 0;
              const canBuy = player.coins >= item.cost;
              return (
                <View key={item.id} style={styles.itemCard}>
                  <Text style={styles.itemEmoji}>{item.emoji}</Text>
                  <View style={styles.itemInfo}>
                    <View style={styles.itemNameRow}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {owned > 0 && (
                        <View style={styles.ownedBadge}>
                          <Text style={styles.ownedText}>보유 {owned}개</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemDesc}>{item.desc}</Text>
                    <Text style={styles.itemCost}>💰 {item.cost} 코인</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.buyBtn, !canBuy && styles.buyBtnDisabled]}
                    onPress={() => handleBuy(item)}
                    disabled={!canBuy}
                  >
                    <Text style={[styles.buyBtnText, !canBuy && styles.buyBtnTextDisabled]}>
                      구매
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  header: { padding: 20, paddingBottom: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  coins: { color: '#f59e0b', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  closeBtn: { position: 'absolute', top: 18, right: 18 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  itemCard: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  itemEmoji: { fontSize: 32, width: 40, textAlign: 'center' },
  itemInfo: { flex: 1, gap: 3 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ownedBadge: { backgroundColor: 'rgba(34,217,122,0.15)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  ownedText: { color: '#22d97a', fontSize: 11, fontWeight: '600' },
  itemDesc: { color: '#888', fontSize: 12, lineHeight: 17 },
  itemCost: { color: '#f59e0b', fontSize: 12, fontWeight: '600', marginTop: 2 },
  buyBtn: { backgroundColor: '#22d97a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  buyBtnDisabled: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  buyBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },
  buyBtnTextDisabled: { color: '#444' },
});
