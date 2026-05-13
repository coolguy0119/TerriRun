import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signInWithGoogle, signInWithKakao, signInWithEmail } from '../services/authService';
import { C, G } from '../theme/pokemon';

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState('');
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const existing = document.querySelector('script[data-kakao]');
    if (existing) return;
    const s = document.createElement('script');
    s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
    s.setAttribute('data-kakao', 'true');
    s.async = true;
    s.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init('4faa438965e9eb55fd22ed19765f39d1');
      }
    };
    document.head.appendChild(s);
  }, []);

  async function handleGoogle() {
    setLoading('google');
    try { const user = await signInWithGoogle(); onLogin(user); }
    catch (e) { Alert.alert('오류', e.message); }
    finally { setLoading(''); }
  }

  async function handleKakao() {
    setLoading('kakao');
    try { const user = await signInWithKakao(); onLogin(user); }
    catch (e) { Alert.alert('오류', e.message); }
    finally { setLoading(''); }
  }

  async function handleEmail() {
    if (!email || !password) { Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.'); return; }
    setLoading('email');
    try { const user = await signInWithEmail(email, password); onLogin(user); }
    catch (e) { Alert.alert('로그인 실패', '이메일 또는 비밀번호가 올바르지 않습니다.'); }
    finally { setLoading(''); }
  }

  if (mode === 'email') {
    return (
      <LinearGradient colors={G.dark} style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
          <TouchableOpacity onPress={() => setMode('main')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={C.yellow} />
            <Text style={[styles.backText, { color: C.yellow }]}>뒤로</Text>
          </TouchableOpacity>

          <View style={styles.orbSmall}>
            <LinearGradient colors={G.vibrant} style={styles.orbSmallGrad} />
          </View>
          <Text style={styles.title}>로그인</Text>
          <Text style={styles.subtitle}>계정으로 계속하기</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={18} color={C.text3} />
              <TextInput style={styles.input} placeholder="이메일" placeholderTextColor={C.text3}
                value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            </View>
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={18} color={C.text3} />
              <TextInput style={styles.input} placeholder="비밀번호" placeholderTextColor={C.text3}
                value={password} onChangeText={setPassword} secureTextEntry={!showPw} />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.text3} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleEmail} activeOpacity={0.85}>
            <LinearGradient colors={G.vibrant} style={styles.primaryBtnGrad}>
              {loading === 'email'
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>로그인</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode('signup')} style={styles.switchBtn}>
            <Text style={styles.switchText}>계정이 없으신가요? <Text style={{ color: C.yellow, fontWeight: '700' }}>회원가입</Text></Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  if (mode === 'signup') {
    return <SignUpForm onBack={() => setMode('email')} onLogin={onLogin} />;
  }

  return (
    <LinearGradient colors={['#0F0820', '#0A0818']} style={styles.container}>
      <View style={styles.inner}>
        {/* Floating orb decoration */}
        <View style={styles.orbWrap}>
          <LinearGradient colors={G.vibrant} style={styles.orb} />
          <View style={styles.orbHalo} />
        </View>

        <Text style={styles.appName}>TERRA RUN</Text>
        <Text style={styles.appSub}>달리면서 영토를 정복하라</Text>
        <View style={styles.titleLine} />

        <View style={styles.btnGroup}>
          {/* 카카오 */}
          <TouchableOpacity style={[styles.socialBtn, styles.kakaoBtn]} onPress={handleKakao} activeOpacity={0.85}>
            {loading === 'kakao' ? <ActivityIndicator color="#3C1E1E" /> : <>
              <Text style={styles.kakaoIcon}>🟡</Text>
              <Text style={styles.kakaoBtnText}>카카오로 시작하기</Text>
            </>}
          </TouchableOpacity>

          {/* 구글 */}
          <TouchableOpacity style={[styles.socialBtn, styles.googleBtn]} onPress={handleGoogle} activeOpacity={0.85}>
            {loading === 'google' ? <ActivityIndicator color="#333" /> : <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleBtnText}>구글로 시작하기</Text>
            </>}
          </TouchableOpacity>

          {/* 네이버 */}
          <TouchableOpacity style={[styles.socialBtn, styles.naverBtn]} activeOpacity={0.85}
            onPress={() => Alert.alert('준비 중', '네이버 로그인은 곧 지원됩니다.')}>
            <Text style={styles.naverIcon}>N</Text>
            <Text style={styles.naverBtnText}>네이버로 시작하기</Text>
          </TouchableOpacity>

          {/* Apple */}
          <TouchableOpacity style={[styles.socialBtn, styles.appleBtn]} activeOpacity={0.85}
            onPress={() => Alert.alert('준비 중', 'Apple 로그인은 Apple Developer 등록 후 지원됩니다.')}>
            <Ionicons name="logo-apple" size={20} color="#fff" />
            <Text style={styles.appleBtnText}>Apple로 시작하기</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 이메일 */}
          <TouchableOpacity style={[styles.socialBtn, styles.emailBtn]} onPress={() => setMode('email')} activeOpacity={0.85}>
            <Ionicons name="mail-outline" size={20} color={C.yellow} />
            <Text style={styles.emailBtnText}>이메일로 시작하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

function SignUpForm({ onBack, onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!name || !email || !password) { Alert.alert('입력 오류', '모든 항목을 입력해주세요.'); return; }
    if (password.length < 6) { Alert.alert('입력 오류', '비밀번호는 6자 이상이어야 합니다.'); return; }
    setLoading(true);
    try {
      const { signUpWithEmail } = await import('../services/authService');
      const user = await signUpWithEmail(email, password, name);
      onLogin(user);
    } catch (e) {
      Alert.alert('가입 실패', '이미 사용 중인 이메일이거나 오류가 발생했습니다.');
    } finally { setLoading(false); }
  }

  return (
    <LinearGradient colors={G.dark} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.yellow} />
          <Text style={[styles.backText, { color: C.yellow }]}>뒤로</Text>
        </TouchableOpacity>

        <View style={styles.orbSmall}>
          <LinearGradient colors={G.vibrant} style={styles.orbSmallGrad} />
        </View>
        <Text style={styles.title}>회원가입</Text>
        <Text style={styles.subtitle}>새 계정 만들기</Text>

        <View style={styles.inputGroup}>
          {[
            { icon: 'person-outline', ph: '닉네임', val: name, set: setName },
            { icon: 'mail-outline', ph: '이메일', val: email, set: setEmail, cap: 'none', kb: 'email-address' },
            { icon: 'lock-closed-outline', ph: '비밀번호 (6자 이상)', val: password, set: setPassword, secure: true },
          ].map((f, i) => (
            <View key={i} style={styles.inputBox}>
              <Ionicons name={f.icon} size={18} color={C.text3} />
              <TextInput style={styles.input} placeholder={f.ph} placeholderTextColor={C.text3}
                value={f.val} onChangeText={f.set} autoCapitalize={f.cap} keyboardType={f.kb} secureTextEntry={f.secure} />
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSignUp} activeOpacity={0.85}>
          <LinearGradient colors={G.vibrant} style={styles.primaryBtnGrad}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>가입하기</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 12 },

  backBtn: { position: 'absolute', top: 56, left: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 15, fontWeight: '600' },

  // Orb decoration
  orbWrap: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  orb: { width: 80, height: 80, borderRadius: 40 },
  orbHalo: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(124,58,237,0.2)' },

  orbSmall: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  orbSmallGrad: { width: 44, height: 44, borderRadius: 22 },

  appName: { color: C.text, fontSize: 32, fontWeight: '800', letterSpacing: 3, textShadowColor: 'rgba(167,139,250,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
  appSub: { color: C.text2, fontSize: 13, letterSpacing: 0.5 },
  titleLine: { width: 40, height: 2, backgroundColor: C.yellow, borderRadius: 1, marginBottom: 8, opacity: 0.7 },

  title: { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { color: C.text2, fontSize: 14, marginTop: -4 },

  btnGroup: { width: '100%', gap: 10, marginTop: 8 },
  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 15, width: '100%' },

  kakaoBtn: { backgroundColor: '#FEE500' },
  kakaoIcon: { fontSize: 18 },
  kakaoBtnText: { color: '#3C1E1E', fontSize: 15, fontWeight: '700' },

  googleBtn: { backgroundColor: '#fff' },
  googleIcon: { fontSize: 18, fontWeight: '900', color: '#4285F4' },
  googleBtnText: { color: '#222', fontSize: 15, fontWeight: '700' },

  naverBtn: { backgroundColor: '#03C75A' },
  naverIcon: { fontSize: 18, fontWeight: '900', color: '#fff' },
  naverBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  appleBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  appleBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: C.text3, fontSize: 12 },

  emailBtn: { backgroundColor: 'rgba(167,139,250,0.1)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)' },
  emailBtnText: { color: C.yellow, fontSize: 15, fontWeight: '700' },

  inputGroup: { width: '100%', gap: 10, marginBottom: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  input: { flex: 1, color: C.text, fontSize: 15 },

  primaryBtn: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  primaryBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  switchBtn: { marginTop: 4 },
  switchText: { color: C.text3, fontSize: 14 },
});
