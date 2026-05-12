import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signInWithGoogle, signInWithKakao, signInWithEmail } from '../services/authService';

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('main'); // main | email | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState('');
  const [showPw, setShowPw] = useState(false);

  async function handleGoogle() {
    setLoading('google');
    try {
      const user = await signInWithGoogle();
      onLogin(user);
    } catch (e) {
      Alert.alert('오류', e.message);
    } finally { setLoading(''); }
  }

  async function handleKakao() {
    setLoading('kakao');
    try {
      const user = await signInWithKakao();
      onLogin(user);
    } catch (e) {
      Alert.alert('오류', e.message);
    } finally { setLoading(''); }
  }

  async function handleEmail() {
    if (!email || !password) { Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.'); return; }
    setLoading('email');
    try {
      const user = await signInWithEmail(email, password);
      onLogin(user);
    } catch (e) {
      Alert.alert('로그인 실패', '이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally { setLoading(''); }
  }

  if (mode === 'email') {
    return (
      <LinearGradient colors={['#0a1a0a', '#0d1117']} style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
          <TouchableOpacity onPress={() => setMode('main')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
            <Text style={styles.backText}>뒤로</Text>
          </TouchableOpacity>

          <Text style={styles.logo}>🏃</Text>
          <Text style={styles.title}>이메일 로그인</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={18} color="#555" />
              <TextInput
                style={styles.input}
                placeholder="이메일"
                placeholderTextColor="#444"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#555" />
              <TextInput
                style={styles.input}
                placeholder="비밀번호"
                placeholderTextColor="#444"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#555" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: '#22d97a' }]}
            onPress={handleEmail}
            activeOpacity={0.85}
          >
            {loading === 'email'
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.loginBtnText}>로그인</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode('signup')} style={styles.switchBtn}>
            <Text style={styles.switchText}>계정이 없으신가요? <Text style={{ color: '#22d97a' }}>회원가입</Text></Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  if (mode === 'signup') {
    return <SignUpForm onBack={() => setMode('email')} onLogin={onLogin} />;
  }

  return (
    <LinearGradient colors={['#0a1a0a', '#0d1117']} style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.logo}>🏃</Text>
        <Text style={styles.title}>TerraRun</Text>
        <Text style={styles.subtitle}>달리면서 영토를 정복하라</Text>

        <View style={styles.btnGroup}>
          {/* Kakao */}
          <TouchableOpacity style={[styles.socialBtn, styles.kakaoBtn]} onPress={handleKakao} activeOpacity={0.85}>
            {loading === 'kakao'
              ? <ActivityIndicator color="#000" />
              : <>
                  <Text style={styles.kakaoIcon}>🟡</Text>
                  <Text style={styles.kakaoBtnText}>카카오로 시작하기</Text>
                </>
            }
          </TouchableOpacity>

          {/* Google */}
          <TouchableOpacity style={[styles.socialBtn, styles.googleBtn]} onPress={handleGoogle} activeOpacity={0.85}>
            {loading === 'google'
              ? <ActivityIndicator color="#333" />
              : <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleBtnText}>구글로 시작하기</Text>
                </>
            }
          </TouchableOpacity>

          {/* Naver - 준비중 */}
          <TouchableOpacity style={[styles.socialBtn, styles.naverBtn]} activeOpacity={0.85}
            onPress={() => Alert.alert('준비 중', '네이버 로그인은 곧 지원됩니다.')}>
            <Text style={styles.naverIcon}>N</Text>
            <Text style={styles.naverBtnText}>네이버로 시작하기</Text>
          </TouchableOpacity>

          {/* Apple - 준비중 */}
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

          {/* Email */}
          <TouchableOpacity style={[styles.socialBtn, styles.emailBtn]} onPress={() => setMode('email')} activeOpacity={0.85}>
            <Ionicons name="mail-outline" size={20} color="#aaa" />
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
    <LinearGradient colors={['#0a1a0a', '#0d1117']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
          <Text style={styles.backText}>뒤로</Text>
        </TouchableOpacity>

        <Text style={styles.logo}>🏃</Text>
        <Text style={styles.title}>회원가입</Text>

        <View style={styles.inputGroup}>
          <View style={styles.inputBox}>
            <Ionicons name="person-outline" size={18} color="#555" />
            <TextInput style={styles.input} placeholder="닉네임" placeholderTextColor="#444" value={name} onChangeText={setName} />
          </View>
          <View style={styles.inputBox}>
            <Ionicons name="mail-outline" size={18} color="#555" />
            <TextInput style={styles.input} placeholder="이메일" placeholderTextColor="#444" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </View>
          <View style={styles.inputBox}>
            <Ionicons name="lock-closed-outline" size={18} color="#555" />
            <TextInput style={styles.input} placeholder="비밀번호 (6자 이상)" placeholderTextColor="#444" value={password} onChangeText={setPassword} secureTextEntry />
          </View>
        </View>

        <TouchableOpacity style={[styles.loginBtn, { backgroundColor: '#22d97a' }]} onPress={handleSignUp} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.loginBtnText}>가입하기</Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 12 },

  backBtn: { position: 'absolute', top: 56, left: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: '#fff', fontSize: 15 },

  logo: { fontSize: 64, marginBottom: 4 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#555', fontSize: 14, marginBottom: 8 },

  btnGroup: { width: '100%', gap: 10, marginTop: 8 },

  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 15, width: '100%' },

  kakaoBtn: { backgroundColor: '#FEE500' },
  kakaoIcon: { fontSize: 18 },
  kakaoBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },

  googleBtn: { backgroundColor: '#fff' },
  googleIcon: { fontSize: 18, fontWeight: '900', color: '#4285F4' },
  googleBtnText: { color: '#333', fontSize: 15, fontWeight: '700' },

  naverBtn: { backgroundColor: '#03C75A' },
  naverIcon: { fontSize: 18, fontWeight: '900', color: '#fff' },
  naverBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  appleBtn: { backgroundColor: '#000', borderWidth: 1, borderColor: '#333' },
  appleBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: '#444', fontSize: 12 },

  emailBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  emailBtnText: { color: '#aaa', fontSize: 15, fontWeight: '600' },

  inputGroup: { width: '100%', gap: 10, marginBottom: 8 },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#141c14', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  input: { flex: 1, color: '#fff', fontSize: 15 },

  loginBtn: { width: '100%', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  loginBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },

  switchBtn: { marginTop: 8 },
  switchText: { color: '#555', fontSize: 14 },
});
