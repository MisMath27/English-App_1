import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider, useTranslation } from './src/context/LanguageContext';

import MainScreen from './src/screens/MainScreen';
import LearnScreen from './src/screens/LearnScreen';
import GoalsScreen from './src/screens/GoalsScreen';
import KnowledgeGraphScreen from './src/screens/KnowledgeGraphScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const AppContent = () => {
  const { colors, fontSizeMultiplier } = useTheme();
  const { t } = useTranslation();

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
            fontSize: 18 * fontSizeMultiplier,
            color: colors.text,
          },
          headerTitleAlign: 'left',
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === t('tab_home')) iconName = 'home';
            else if (route.name === t('tab_learn')) iconName = 'menu-book';
            else if (route.name === t('tab_goals')) iconName = 'track-changes';
            else if (route.name === t('tab_graph')) iconName = 'device-hub';
            else if (route.name === t('tab_settings')) iconName = 'settings';
            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.backgroundSecondary,
            borderTopColor: colors.cardBorder,
          },
          tabBarLabelStyle: {
            fontSize: 11 * fontSizeMultiplier,
          },
        })}
      >
        <Tab.Screen name={t('tab_home')} component={MainScreen} />
        <Tab.Screen name={t('tab_learn')} component={LearnScreen} />
        <Tab.Screen name={t('tab_goals')} component={GoalsScreen} />
        <Tab.Screen name={t('tab_graph')} component={KnowledgeGraphScreen} />
        <Tab.Screen name={t('tab_settings')} component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LanguageProvider>
          <SafeAreaProvider>
            <AppContent />
          </SafeAreaProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}