import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

const DURATION = 12;
const GRID = 6; // 6x6

function makeGrid() {
  return Array.from({ length: GRID * GRID }, () => ({
    owner: Math.random() > 0.4 ? 'enemy' : 'neutral',
  }));
}

export default function TerritoryRushGame({ onFinish }) {
  const [phase, setPhase] = useState('ready');
  const [cells, setCells] = useState(makeGrid());
  const [captured, setCaptured] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const timerRef = useRef(null);

  function startGame() {
    setCells(makeGrid());
    setCaptured(0);
    setTimeLeft(DURATION);
    setPhase('playing');
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); setPhase('done'); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  useEffect(() => () => clearInterval(timerRef.current), []);

  function handleCell(i) {
    if (phase !== 'playing') return;
    setCells((prev) => {
      if (prev[i].owner === 'player') return prev;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = [...prev];
      next[i] = { owner: 'player' };
      return next;
    });
    setCaptured((c) => c + 1);
  }

  const bp = captured * 5;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗺️ 영토 돌격</Text>

      {phase === 'ready' && (
        <View style={styles.center}>
          <Text style={styles.desc}>12초 안에 격자판 셀을 최대한 많이 점령하세요!</Text>
          <View style={styles.legend}>
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} /><Text style={styles.legText}>적 영토</Text>
            <View style={[styles.dot, { backgroundColor: '#444' }]} /><Text style={styles.legText}>중립</Text>
            <View style={[styles.dot, { backgroundColor: '#22d97a' }]} /><Text style={styles.legText}>내 영토</Text>
          </View>
          <TouchableOpacity style={styles.startBtn} onPress={startGame}>
            <Text style={styles.startText}>시작!</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'playing' && (
        <View style={styles.gameArea}>
          <View style={styles.hud}>
            <Text style={styles.timer}>{timeLeft}s</Text>
            <Text style={styles.capCount}>🚩 {captured}칸</Text>
          </View>
          <View style={styles.grid}>
            {cells.map((cell, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.cell,
                  cell.owner === 'player' && styles.cellPlayer,
                  cell.owner === 'enemy'  && styles.cellEnemy,
                  cell.owner === 'neutral' && styles.cellNeutral,
                ]}
                onPress={() => handleCell(i)}
                activeOpacity={0.6}
              >
                {cell.owner === 'player' && <Text style={styles.cellEmoji}>🚩</Text>}
                {cell.owner === 'enemy'  && <Text style={styles.cellEmoji}>⚔️</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {phase === 'done' && (
        <View style={styles.center}>
          <Text style={styles.result}>점령: {captured}칸</Text>
          <Text style={styles.bp}>+{bp} BP 획득!</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => onFinish(bp)}>
            <Text style={styles.doneText}>완료</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center', paddingTop: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  desc: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legText: { color: '#888', fontSize: 12, marginRight: 8 },
  gameArea: { flex: 1 },
  hud: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  timer: { color: '#ef4444', fontSize: 28, fontWeight: '800' },
  capCount: { color: '#22d97a', fontSize: 24, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 4 },
  cell: { width: '15%', aspectRatio: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', margin: '0.83%' },
  cellPlayer:  { backgroundColor: 'rgba(34,217,122,0.5)', borderWidth: 1, borderColor: '#22d97a' },
  cellEnemy:   { backgroundColor: 'rgba(239,68,68,0.4)', borderWidth: 1, borderColor: '#ef4444' },
  cellNeutral: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#333' },
  cellEmoji: { fontSize: 14 },
  result: { color: '#fff', fontSize: 28, fontWeight: '700' },
  bp: { color: '#22d97a', fontSize: 36, fontWeight: '800' },
  startBtn: { backgroundColor: '#8b5cf6', borderRadius: 16, paddingHorizontal: 48, paddingVertical: 16 },
  startText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  doneBtn: { backgroundColor: '#22d97a', borderRadius: 16, paddingHorizontal: 48, paddingVertical: 16 },
  doneText: { color: '#000', fontSize: 18, fontWeight: '700' },
});
