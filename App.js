import React, { useState, useEffect } from 'react';
import { View, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import RunScreen from './src/screens/RunScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AllianceScreen from './src/screens/AllianceScreen';
import BattleScreen from './src/screens/BattleScreen';
import DeliveryScreen from './src/screens/DeliveryScreen';
import TrackListScreen from './src/screens/TrackListScreen';
import TrackRunScreen from './src/screens/TrackRunScreen';
import ArenaScreen from './src/screens/ArenaScreen';
import RaceScreen from './src/screens/RaceScreen';
import LoginScreen from './src/screens/LoginScreen';
import { onAuthChange, handleKakaoRedirect } from './src/services/authService';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const DARK_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0A0818',
    card: '#130D2A',
    text: '#ffffff',
    border: 'rgba(255,255,255,0.1)',
    primary: '#A78BFA',
  },
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home:     focused ? 'home'         : 'home-outline',
            Run:      focused ? 'play-circle'  : 'play-circle-outline',
            Alliance: focused ? 'shield'       : 'shield-outline',
            Profile:  focused ? 'person'       : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={route.name === 'Run' ? size + 6 : size} color={color} />;
        },
        tabBarActiveTintColor: '#A78BFA',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
        tabBarStyle: {
          backgroundColor: '#0A0818',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 58,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     options={{ tabBarLabel: '홈' }} />
      <Tab.Screen name="Run"      component={RunScreen}      options={{ tabBarLabel: '달리기' }} />
      <Tab.Screen name="Alliance" component={AllianceScreen} options={{ tabBarLabel: '연맹' }} />
      <Tab.Screen name="Profile"  component={ProfileScreen}  options={{ tabBarLabel: '프로필' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    if (Platform.OS === 'web') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('code')) {
        handleKakaoRedirect()
          .then(u => { if (u) setUser(u); })
          .catch(console.error);
      }
    }
    const unsubscribe = onAuthChange((u) => setUser(u));
    return unsubscribe;
  }, []);

  // Loading
  if (user === undefined) {
    return <View style={{ flex: 1, backgroundColor: '#0d1117' }} />;
  }

  // Not logged in
  if (!user) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <LoginScreen onLogin={setUser} />
      </SafeAreaProvider>
    );
  }

  // Logged in
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={DARK_THEME}>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main"     component={TabNavigator} />
          <Stack.Screen name="Battle"    component={BattleScreen} />
          <Stack.Screen name="Delivery"  component={DeliveryScreen} />
          <Stack.Screen name="TrackList" component={TrackListScreen} />
          <Stack.Screen name="TrackRun"  component={TrackRunScreen} />
          <Stack.Screen name="Arena"     component={ArenaScreen} />
          <Stack.Screen name="Race"      component={RaceScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
