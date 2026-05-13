import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TapBattleGame from '../components/games/TapBattleGame';
import TargetShotGame from '../components/games/TargetShotGame';
import TerritoryRushGame from '../components/games/TerritoryRushGame';
import { getPlayer, savePlayer } from '../utils/storage';

export default function BattleScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { gameId } = route.params;

  async function handleFinish(bp) {
    const player = await getPlayer();
    if (!player.alliance) { navigation.goBack(); return; }
    const updatedAlliance = {
      ...player.alliance,
      battlePoints: player.alliance.battlePoints + bp,
    };
    await savePlayer({ ...player, alliance: updatedAlliance });
    Alert.alert(
      '전투 완료! ⚔️',
      `+${bp} BP 획득!\n총 BP: ${updatedAlliance.battlePoints}`,
      [{ text: '확인', onPress: () => navigation.goBack() }]
    );
  }

  const GameComponent =
    gameId === 'tap_battle'     ? TapBattleGame :
    gameId === 'target_shot'    ? TargetShotGame :
    gameId === 'territory_rush' ? TerritoryRushGame : null;

  if (!GameComponent) { navigation.goBack(); return null; }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </TouchableOpacity>
      <GameComponent onFinish={handleFinish} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  backBtn: { position: 'absolute', top: 50, left: 16, zIndex: 10, backgroundColor: 'rgba(26,26,46,0.85)', borderRadius: 20, padding: 6, borderWidth: 2, borderColor: 'rgba(255,203,5,0.4)' },
});
