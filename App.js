import React from 'react';
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

export default function App() {
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
