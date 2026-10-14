import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

import MainScreen from './src/screens/MainScreen';
import LearnScreen from './src/screens/LearnScreen';
import GoalsScreen from './src/screens/GoalsScreen';
import KnowledgeGraphScreen from './src/screens/KnowledgeGraphScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const AppContent = () => {
  const { colors } = useTheme();

  // Тёмная тема для NavigationContainer, чтобы нигде не проскакивал светлый фон
  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.backgroundSecondary,
      text: colors.text,
      border: colors.cardBorder,
      primary: colors.primary,
      notification: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          // ─── Шапка вкладки (убираем белую полосу) ───
          headerStyle: {
            backgroundColor: colors.background,
            shadowColor: 'transparent',
            elevation: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.cardBorder,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
            color: colors.text,
          },
          headerTitleAlign: 'left',

          // ─── Иконки ───
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === 'Главная') iconName = 'home';
            else if (route.name === 'Учить') iconName = 'menu-book';
            else if (route.name === 'Цели') iconName = 'track-changes';
            else if (route.name === 'Граф знаний') iconName = 'device-hub';
            else if (route.name === 'Настройки') iconName = 'settings';
            return <Icon name={iconName} size={size} color={color} />;
          },

          // ─── Таб-бар ───
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.backgroundSecondary,
            borderTopColor: colors.cardBorder,
          },
        })}
      >
        <Tab.Screen name="Главная" component={MainScreen} />
        <Tab.Screen name="Учить" component={LearnScreen} />
        <Tab.Screen name="Цели" component={GoalsScreen} />
        <Tab.Screen name="Граф знаний" component={KnowledgeGraphScreen} />
        <Tab.Screen name="Настройки" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}