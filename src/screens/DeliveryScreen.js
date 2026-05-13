import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Linking, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getTerritories } from '../utils/storage';
import { cellCenter, CELL_SIZE, formatDistance } from '../utils/geo';
import { getNearbyRestaurants, isMockData } from '../services/restaurantService';
import { C } from '../theme/pokemon';

// 캡처된 영토들의 중심 좌표 계산
function getTerritoryCenter(territories) {
  const cells = Object.values(territories).filter((c) => c.owner === 'player');
  if (cells.length === 0) return null;
  const sumLat = cells.reduce((s, c) => s + cellCenter(c.row, c.col).latitude, 0);
  const sumLng = cells.reduce((s, c) => s + cellCenter(c.row, c.col).longitude, 0);
  return { lat: sumLat / cells.length, lng: sumLng / cells.length };
}

const DELIVERY_APPS = [
  { name: '배달의민족', emoji: '🐣', color: '#2AC1BC', scheme: 'baemin://', web: 'https://www.baemin.com' },
  { name: '쿠팡이츠',  emoji: '🛵', color: '#C00C3F', scheme: 'coupangeats://', web: 'https://www.coupangeats.com' },
  { name: '요기요',    emoji: '🍱', color: '#FA2828', scheme: 'yogiyo://', web: 'https://www.yogiyo.co.kr' },
];

const CATEGORY_EMOJI = {
  '한식': '🍚', '중식': '🥡', '일식': '🍣', '양식': '🍝',
  '치킨': '🍗', '피자': '🍕', '분식': '🥢', '카페': '☕',
  '패스트푸드': '🍔', '족발': '🐷', '버거': '🍔',
};

function getCategoryEmoji(category) {
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (category?.includes(key)) return emoji;
  }
  return '🍽️';
}

async function openDeliveryApp(app, restaurantName) {
  const canOpen = await Linking.canOpenURL(app.scheme);
  if (canOpen) {
    await Linking.openURL(app.scheme);
  } else {
    await Linking.openURL(app.web);
  }
}

export default function DeliveryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [restaurants, setRestaurants] = useState([]);
  const [center, setCenter] = useState(null);
  const [cellCount, setCellCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [radius, setRadius] = useState(500);

  useEffect(() => { loadData(); }, [radius]);

  async function loadData() {
    setLoading(true);
    try {
      const terr = await getTerritories();
      const playerCells = Object.values(terr).filter((c) => c.owner === 'player');
      setCellCount(playerCells.length);
      const c = getTerritoryCenter(terr);
      setCenter(c);
      if (c) {
        const list = await getNearbyRestaurants(c.lat, c.lng, radius);
        setRestaurants(list);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function renderRestaurant({ item }) {
    const emoji = getCategoryEmoji(item.category);
    return (
      <View style={styles.restaurantCard}>
        <View style={styles.restaurantLeft}>
          <Text style={styles.restaurantEmoji}>{emoji}</Text>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{item.name}</Text>
            <Text style={styles.restaurantCategory}>{item.category?.split(' > ').pop()}</Text>
            <Text style={styles.restaurantDist}>📍 {item.distance}m</Text>
          </View>
        </View>
        <View style={styles.orderBtns}>
          {DELIVERY_APPS.map((app) => (
            <TouchableOpacity
              key={app.name}
              style={[styles.orderBtn, { backgroundColor: app.color + '22', borderColor: app.color + '55' }]}
              onPress={() => openDeliveryApp(app, item.name)}
            >
              <Text style={styles.orderBtnText}>{app.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={['#0a0f2a', '#1a1a2e']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.yellow} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🛵 영토 배달</Text>
          {cellCount > 0 && (
            <Text style={styles.headerSub}>내 영토 {cellCount}칸 중심 반경 {radius}m</Text>
          )}
        </View>
      </LinearGradient>

      {/* Mock data notice */}
      {isMockData() && (
        <View style={styles.mockBanner}>
          <Ionicons name="information-circle-outline" size={14} color="#f59e0b" />
          <Text style={styles.mockText}>시뮬레이션 데이터 — 카카오 API 키 추가 시 실제 식당 표시</Text>
        </View>
      )}

      {cellCount === 0 && !loading && (
        <View style={styles.emptyArea}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyTitle}>영토가 없어요</Text>
          <Text style={styles.emptyDesc}>달리면서 영토를 확보하면 주변 식당에서 배달 주문할 수 있어요!</Text>
          <TouchableOpacity style={styles.goRunBtn} onPress={() => navigation.navigate('Run')}>
            <Text style={styles.goRunText}>달리러 가기</Text>
          </TouchableOpacity>
        </View>
      )}

      {cellCount > 0 && (
        <>
          {/* Radius selector */}
          <View style={styles.radiusRow}>
            <Text style={styles.radiusLabel}>검색 반경</Text>
            {[300, 500, 1000, 2000].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusChip, radius === r && styles.radiusChipOn]}
                onPress={() => setRadius(r)}
              >
                <Text style={[styles.radiusChipText, radius === r && styles.radiusChipTextOn]}>
                  {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Delivery app shortcuts */}
          <View style={styles.appRow}>
            <Text style={styles.appRowLabel}>앱으로 바로 주문</Text>
            <View style={styles.appBtns}>
              {DELIVERY_APPS.map((app) => (
                <TouchableOpacity
                  key={app.name}
                  style={[styles.appBtn, { borderColor: app.color }]}
                  onPress={() => openDeliveryApp(app)}
                >
                  <Text style={styles.appEmoji}>{app.emoji}</Text>
                  <Text style={[styles.appName, { color: app.color }]}>{app.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Restaurant list */}
          {loading ? (
            <ActivityIndicator color="#22d97a" size="large" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={restaurants}
              keyExtractor={(item) => item.id}
              renderItem={renderRestaurant}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22d97a" />}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>주변 식당을 찾지 못했어요</Text>
                </View>
              }
              ListHeaderComponent={
                <Text style={styles.listHeader}>근처 식당 {restaurants.length}곳</Text>
              }
            />
          )}
        </>
      )}
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

  mockBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,203,5,0.08)', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'rgba(255,203,5,0.2)' },
  mockText: { color: C.yellow, fontSize: 11, flex: 1 },

  radiusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  radiusLabel: { color: C.text3, fontSize: 12, marginRight: 4, fontWeight: '700' },
  radiusChip: { backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 2, borderColor: C.border },
  radiusChipOn: { backgroundColor: 'rgba(255,203,5,0.12)', borderColor: C.yellow },
  radiusChipText: { color: C.text3, fontSize: 12, fontWeight: '700' },
  radiusChipTextOn: { color: C.yellow, fontWeight: '800' },

  appRow: { paddingHorizontal: 16, paddingBottom: 10 },
  appRowLabel: { color: C.text3, fontSize: 12, marginBottom: 8, fontWeight: '700' },
  appBtns: { flexDirection: 'row', gap: 10 },
  appBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 2, borderRadius: 12, paddingVertical: 10 },
  appEmoji: { fontSize: 18 },
  appName: { fontSize: 12, fontWeight: '800' },

  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  listHeader: { color: C.text2, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  restaurantCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: C.border },
  restaurantLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  restaurantEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
  restaurantInfo: { flex: 1 },
  restaurantName: { color: C.text, fontSize: 14, fontWeight: '800' },
  restaurantCategory: { color: C.text2, fontSize: 11, marginTop: 2 },
  restaurantDist: { color: C.yellow, fontSize: 11, marginTop: 2, fontWeight: '700' },
  orderBtns: { flexDirection: 'row', gap: 6 },
  orderBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  orderBtnText: { fontSize: 18 },

  emptyArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { color: C.text, fontSize: 20, fontWeight: '800' },
  emptyDesc: { color: C.text3, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  goRunBtn: { backgroundColor: C.yellow, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 12, marginTop: 8 },
  goRunText: { color: '#1a1a2e', fontSize: 16, fontWeight: '900' },

  emptyList: { padding: 32, alignItems: 'center' },
  emptyListText: { color: C.text3, fontSize: 14 },
});
