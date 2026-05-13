import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loginWithKakao, isKakaoConfigured, getRedirectUri } from '../services/kakaoAuthService';

export default function LoginScreen({ onLogin }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  async function handleKakaoLogin() {
    if (!isKakaoConfigured()) {
      Alert.alert(
        '카카오 설정 필요',
        `카카오 개발자 콘솔(developers.kakao.com)에서:\n1. 앱 생성 후 REST API 키 복사\n2. kakaoAuthService.js에 키 입력\n3. Redirect URI 등록: ${getRedirectUri()}`,
        [{ text: '확인' }]
      );
      return;
    }
    setLoading(true);
    try {
      const authData = await loginWithKakao();
      if (authData) {
        await onLogin(authData);
      }
      // null = 사용자가 직접 취소한 경우 (아무 알림 불필요)
    } catch (e) {
      Alert.alert(
        '카카오 로그인 실패',
        e.message,
        [
          { text: '게스트로 시작', onPress: handleGuestLogin },
          { text: '확인', style: 'cancel' },
        ]
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGuestLogin() {
    const guestId = `guest_${Date.now()}`;
    await onLogin({ userId: guestId, isGuest: true, nickname: '게스트', loggedInAt: Date.now() });
  }

  return (
    <LinearGradient colors={['#0A0818', '#150B35', '#0A0818']} style={[styles.container, { paddingTop: insets.top }]}>
      {/* Logo / Title */}
      <View style={styles.logoArea}>
        <View style={styles.logoCircle}>
          <Ionicons name="map" size={52} color="#A78BFA" />
        </View>
        <Text style={styles.title}>TerraRun</Text>
        <Text style={styles.subtitle}>달리며 세계를 정복하세요</Text>
      </View>

      {/* Login Buttons */}
      <View style={styles.btnArea}>
        <TouchableOpacity
          style={styles.kakaoBtn}
          onPress={handleKakaoLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#191919" />
          ) : (
            <>
              <View style={styles.kakaoIconBox}>
                <Text style={styles.kakaoIcon}>💬</Text>
              </View>
              <Text style={styles.kakaoBtnText}>카카오로 시작하기</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.guestBtn} onPress={handleGuestLogin} activeOpacity={0.8}>
          <Ionicons name="person-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
          <Text style={styles.guestBtnText}>게스트로 시작</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.notice}>
        카카오 계정으로 로그인하면 게임 데이터가{'\n'}클라우드에 저장됩니다.
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  logoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A0A3E',
    borderWidth: 2,
    borderColor: '#A78BFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.5,
  },
  btnArea: {
    width: '100%',
    paddingHorizontal: 32,
    gap: 12,
  },
  kakaoBtn: {
    backgroundColor: '#FEE500',
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  kakaoIconBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakaoIcon: {
    fontSize: 18,
  },
  kakaoBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191919',
  },
  guestBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  guestBtnText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
  },
  notice: {
    marginTop: 24,
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 18,
  },
});
