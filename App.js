import React, { useState, useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import auth from '@react-native-firebase/auth';
import { ActivityIndicator, View } from 'react-native';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider, useTranslation } from './src/context/LanguageContext';


import WelcomeScreen from './src/screens/WelcomeScreen';
import MainScreen from './src/screens/MainScreen';
import LearnScreen from './src/screens/LearnScreen';
import GoalsScreen from './src/screens/HackerMapScreen';
import KnowledgeGraphScreen from './src/screens/KnowledgeGraphScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import GrammarScreen from './src/screens/GrammarScreen';
import GoalDetailScreen from './src/screens/GoalDetailScreen';
import LegalScreen from './src/screens/LegalScreen';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const GraphStack = createNativeStackNavigator(); // <-- Стек для графа

// Стек для вкладки "Граф знаний"
const GraphStackScreen = () => {
  const { colors } = useTheme();
  return (
    <GraphStack.Navigator>
      <GraphStack.Screen
        name="KnowledgeGraphMain"
        component={KnowledgeGraphScreen}
        options={{
          headerShown: true,
          title: 'Граф знаний',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <GraphStack.Screen
        name="GoalDetailScreen"
        component={GoalDetailScreen}
        options={{ headerShown: false }}
      />
    </GraphStack.Navigator>
  );
};

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
      {/* Вкладка "Граф" использует стек */}
      <Tab.Screen
        name={t('tab_graph')}
        component={GraphStackScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen name={t('tab_settings')} component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const RootNavigator = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const { colors } = useTheme();

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged((userState) => {
      setUser(userState);
      if (initializing) setInitializing(false);
    });
    return subscriber;
  }, [initializing]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="MainTabs" component={AppContent} />
          <Stack.Screen
            name="GrammarScreen"
            component={GrammarScreen}
            options={({ route }) => ({
              headerShown: true,
              title: route.params?.cityName || 'Грамматика',
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
            })}
          />
          <Stack.Screen
            name="LegalScreen"
            component={LegalScreen}
            options={{ headerShown: false }}
            />
        </>
      ) : (
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LanguageProvider>
          <SafeAreaProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </SafeAreaProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}