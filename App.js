import './src/utils/tasks'; // Register background location task
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
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
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const DARK_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0d1117',
    card: '#0f1a0f',
    text: '#ffffff',
    border: '#1a2a1a',
    primary: '#22d97a',
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
        tabBarActiveTintColor: '#22d97a',
        tabBarInactiveTintColor: '#445',
        tabBarStyle: {
          backgroundColor: '#0a100a',
          borderTopColor: '#1a2a1a',
          borderTopWidth: 0.5,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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

function AppContent() {
  const { auth, login, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d1117', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#22d97a" />
      </View>
    );
  }

  if (!auth) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <NavigationContainer theme={DARK_THEME}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main"     component={TabNavigator} />
        <Stack.Screen name="Battle"   component={BattleScreen} />
        <Stack.Screen name="Delivery" component={DeliveryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
