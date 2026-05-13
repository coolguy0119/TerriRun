import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loginWithKakao, isKakaoConfigured, getRedirectUri } from '../services/kakaoAuthService';
import {
  signInWithGoogle, signInWithEmail, signUpWithEmail,
} from '../services/authService';

export default function LoginScreen({ onLogin }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(null); // 'kakao' | 'google' | 'email'
  const [showEmail, setShowEmail] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  function firebaseUserToAuth(user) {
    return {
      userId: user.uid,
      nickname: user.displayName || user.email?.split('@')[0] || '유저',
      email: user.email,
      loggedInAt: Date.now(),
    };
  }

  async function handleKakaoLogin() {
    if (!isKakaoConfigured()) {
      Alert.alert('카카오 설정 필요', `Redirect URI 등록: ${getRedirectUri()}`);
      return;
    }
    setLoading('kakao');
    try {
      const authData = await loginWithKakao();
      if (authData) await onLogin(authData);
    } catch (e) {
      Alert.alert('카카오 로그인 실패', e.message, [
        { text: '게스트로 시작', onPress: handleGuestLogin },
        { text: '확인', style: 'cancel' },
      ]);
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogleLogin() {
    setLoading('google');
    try {
      const user = await signInWithGoogle();
      await onLogin(firebaseUserToAuth(user));
    } catch (e) {
      Alert.alert('구글 로그인 실패', e.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleEmailSubmit() {
    if (!email || !password) { Alert.alert('입력 필요', '이메일과 비밀번호를 입력해주세요.'); return; }
    if (isSignUp && !name) { Alert.alert('입력 필요', '닉네임을 입력해주세요.'); return; }
    setLoading('email');
    try {
      const user = isSignUp
        ? await signUpWithEmail(email, password, name)
        : await signInWithEmail(email, password);
      await onLogin(firebaseUserToAuth(user));
    } catch (e) {
      const msg = e.code === 'auth/user-not-found' ? '등록되지 않은 이메일입니다.'
        : e.code === 'auth/wrong-password' ? '비밀번호가 틀렸습니다.'
        : e.code === 'auth/email-already-in-use' ? '이미 사용 중인 이메일입니다.'
        : e.code === 'auth/weak-password' ? '비밀번호는 6자 이상이어야 합니다.'
        : e.message;
      Alert.alert('로그인 실패', msg);
    } finally {
      setLoading(null);
    }
  }

  async function handleGuestLogin() {
    const guestId = `guest_${Date.now()}`;
    await onLogin({ userId: guestId, isGuest: true, nickname: '게스트', loggedInAt: Date.now() });
  }

  return (
    <LinearGradient colors={['#0A0818', '#150B35', '#0A0818']} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoHalo}>
              <LinearGradient colors={['#7C3AED', '#A855F7']} style={styles.logoCircle} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}>
                <Text style={styles.logoEmoji}>🏃</Text>
              </LinearGradient>
            </View>
            <Text style={styles.title}>TERRA RUN</Text>
            <Text style={styles.subtitle}>달리며 세계를 정복하세요</Text>
          </View>

          {/* Buttons / Email Form */}
          <View style={styles.btnArea}>
            {!showEmail ? (
              <>
                {/* 카카오 */}
                <TouchableOpacity style={styles.kakaoBtn} onPress={handleKakaoLogin} disabled={!!loading} activeOpacity={0.85}>
                  {loading === 'kakao' ? <ActivityIndicator color="#191919" /> : (
                    <>
                      <Text style={styles.kakaoIcon}>💬</Text>
                      <Text style={styles.kakaoBtnText}>카카오로 시작하기</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* 구글 */}
                <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} disabled={!!loading} activeOpacity={0.85}>
                  {loading === 'google' ? <ActivityIndicator color="#191919" /> : (
                    <>
                      <Text style={styles.googleIcon}>G</Text>
                      <Text style={styles.googleBtnText}>구글로 시작하기</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* 이메일 */}
                <TouchableOpacity style={styles.emailBtn} onPress={() => setShowEmail(true)} disabled={!!loading} activeOpacity={0.85}>
                  <Ionicons name="mail-outline" size={18} color="#A78BFA" style={{ marginRight: 8 }} />
                  <Text style={styles.emailBtnText}>이메일로 시작하기</Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>또는</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* 게스트 */}
                <TouchableOpacity style={styles.guestBtn} onPress={handleGuestLogin} activeOpacity={0.8}>
                  <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
                  <Text style={styles.guestBtnText}>게스트로 시작</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* 이메일 폼 */
              <View style={styles.emailForm}>
                <View style={styles.emailFormHeader}>
                  <TouchableOpacity onPress={() => { setShowEmail(false); setIsSignUp(false); }}>
                    <Ionicons name="chevron-back" size={22} color="#A78BFA" />
                  </TouchableOpacity>
                  <Text style={styles.emailFormTitle}>{isSignUp ? '회원가입' : '이메일 로그인'}</Text>
                  <View style={{ width: 22 }} />
                </View>

                {isSignUp && (
                  <View style={styles.inputWrap}>
                    <Ionicons name="person-outline" size={16} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="닉네임"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="none"
                    />
                  </View>
                )}

                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={16} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="이메일"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={16} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="비밀번호 (6자 이상)"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="password"
                  />
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleEmailSubmit} disabled={!!loading} activeOpacity={0.85}>
                  {loading === 'email' ? <ActivityIndicator color="#fff" /> : (
                    <Text style={styles.submitBtnText}>{isSignUp ? '가입하기' : '로그인'}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.toggleWrap}>
                  <Text style={styles.toggleText}>
                    {isSignUp ? '이미 계정이 있어요 → ' : '처음이에요 → '}
                    <Text style={styles.toggleLink}>{isSignUp ? '로그인' : '회원가입'}</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.notice}>
            로그인하면 게임 데이터가 클라우드에 저장됩니다.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  logoArea: { alignItems: 'center', gap: 14, marginBottom: 32 },
  logoHalo: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(124,58,237,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 46 },
  title: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5 },

  btnArea: { width: '100%', paddingHorizontal: 32, gap: 12 },

  kakaoBtn: {
    backgroundColor: '#FEE500', borderRadius: 14, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  kakaoIcon: { fontSize: 18 },
  kakaoBtnText: { fontSize: 16, fontWeight: '700', color: '#191919' },

  googleBtn: {
    backgroundColor: '#fff', borderRadius: 14, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  googleIcon: { fontSize: 18, fontWeight: '900', color: '#4285F4' },
  googleBtnText: { fontSize: 16, fontWeight: '700', color: '#191919' },

  emailBtn: {
    backgroundColor: 'rgba(124,58,237,0.15)', borderRadius: 14, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
  },
  emailBtnText: { fontSize: 16, fontWeight: '600', color: '#A78BFA' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { fontSize: 13, color: 'rgba(255,255,255,0.3)' },

  guestBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, height: 50,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  guestBtnText: { fontSize: 15, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },

  emailForm: { gap: 12 },
  emailFormHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  emailFormTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    height: 52, paddingHorizontal: 16, gap: 10,
  },
  inputIcon: { width: 20 },
  input: { flex: 1, color: '#fff', fontSize: 15 },

  submitBtn: {
    backgroundColor: '#7C3AED', borderRadius: 14, height: 54,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  toggleWrap: { alignItems: 'center', paddingVertical: 8 },
  toggleText: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  toggleLink: { color: '#A78BFA', fontWeight: '600' },

  notice: {
    marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.25)',
    textAlign: 'center', lineHeight: 18,
  },
});
