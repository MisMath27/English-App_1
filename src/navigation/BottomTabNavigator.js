import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

import MainScreen from '../screens/MainScreen';
import LearnScreen from '../screens/LearnScreen';
import GoalsScreen from '../screens/HackerMapScreen';
import KnowledgeGraphScreen from '../screens/KnowledgeGraphScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundSecondary || '#1a1a2e',
          borderTopColor: colors.cardBorder || 'rgba(255,255,255,0.1)',
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarActiveTintColor: colors.primary || '#4CAF50',
        tabBarInactiveTintColor: colors.textSecondary || '#888',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Главная') iconName = 'home';
          else if (route.name === 'Учить') iconName = 'menu-book';
          else if (route.name === 'Карта') iconName = 'flag';
          else if (route.name === 'Граф знаний') iconName = 'account-tree';
          else if (route.name === 'Настройки') iconName = 'settings';
          return <Icon name={iconName} size={size || 24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Главная" component={MainScreen} />
      <Tab.Screen name="Учить" component={LearnScreen} />
      <Tab.Screen name="Карта" component={GoalsScreen} />
      <Tab.Screen name="Граф знаний" component={KnowledgeGraphScreen} />
      <Tab.Screen name="Настройки" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;