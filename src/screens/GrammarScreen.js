import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function GrammarScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { cityName, topic } = route.params || {};

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Icon name="terminal" size={60} color="#00FFCC" />
      <Text style={[styles.title, { color: colors.text }]}>
        {cityName || 'Город'}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Тема: {topic || 'Неизвестно'}
      </Text>
      <Text style={[styles.info, { color: colors.textMuted }]}>
        Здесь скоро будут задания по этой теме...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 20, fontFamily: 'monospace' },
  subtitle: { fontSize: 18, marginTop: 10, fontFamily: 'monospace' },
  info: { fontSize: 14, marginTop: 30, textAlign: 'center' },
});