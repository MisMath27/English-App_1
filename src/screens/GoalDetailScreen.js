import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../context/ThemeContext';

export default function GoalDetailScreen({ route, navigation }) {
  const { nodeName } = route.params;
  const { colors } = useTheme();

  const [goals, setGoals] = useState([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentUid, setCurrentUid] = useState(null);

  useEffect(() => {
    const user = auth().currentUser;
    const uid = user ? user.uid : null;
    setCurrentUid(uid);
    if (uid) loadGoals(uid);
  }, []);

  const loadGoals = async (uid) => {
    try {
      const raw = await AsyncStorage.getItem(`@english_app:goals_${uid}`);
      const allGoals = raw ? JSON.parse(raw) : [];
      setGoals(allGoals.filter(g => g.nodeName === nodeName));
    } catch (e) { console.log(e); }
  };

  const saveGoals = async (updatedGoals) => {
    if (!currentUid) return;
    const raw = await AsyncStorage.getItem(`@english_app:goals_${currentUid}`);
    const allGoals = raw ? JSON.parse(raw) : [];
    const otherGoals = allGoals.filter(g => g.nodeName !== nodeName);
    const newAllGoals = [...otherGoals, ...updatedGoals];
    await AsyncStorage.setItem(`@english_app:goals_${currentUid}`, JSON.stringify(newAllGoals));
    setGoals(updatedGoals);
  };

  const addGoal = () => {
    if (!newGoalText.trim()) return;
    const newGoal = {
      id: Date.now(),
      nodeName,
      text: newGoalText.trim(),
      progress: 0,
      target: parseInt(newGoalTarget, 10) || 100,
      current: 0,
      completed: false,
      notes: '',
      createdAt: new Date().toISOString(),
    };
    saveGoals([...goals, newGoal]);
    setNewGoalText('');
    setNewGoalTarget('');
    setModalVisible(false);
  };

  const updateProgress = (id, delta) => {
    const updated = goals.map(g => {
      if (g.id === id) {
        const newCurrent = Math.max(0, g.current + delta);
        const newProgress = g.target > 0 ? Math.round((newCurrent / g.target) * 100) : 0;
        return { ...g, current: newCurrent, progress: newProgress };
      }
      return g;
    });
    saveGoals(updated);
  };

  const deleteGoal = (id) => {
    Alert.alert('Удалить цель?', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => {
        saveGoals(goals.filter(g => g.id !== id));
      }}
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {nodeName}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="flag" size={60} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Нет целей для этого узла
            </Text>
          </View>
        ) : (
          goals.map(goal => (
            <View key={goal.id} style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{goal.text}</Text>
                <TouchableOpacity onPress={() => deleteGoal(goal.id)}>
                  <Icon name="delete-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>

              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${Math.min(goal.progress, 100)}%`, backgroundColor: colors.primary }]} />
              </View>

              <TextInput
                style={[styles.notesInput, { color: colors.textSecondary }]}
                placeholder="Добавить заметку..."
                placeholderTextColor={colors.textMuted}
                value={goal.notes}
                onChangeText={(text) => {
                  const updated = goals.map(g => g.id === goal.id ? { ...g, notes: text } : g);
                  setGoals(updated);
                  AsyncStorage.setItem(`@english_app:goals_${currentUid}`, JSON.stringify(updated));
                }}
                multiline
              />

              <View style={styles.cardFooter}>
                <View style={styles.counterContainer}>
                  <TouchableOpacity onPress={() => updateProgress(goal.id, -1)} style={[styles.counterBtn, { backgroundColor: colors.error + '20' }]}>
                    <Icon name="remove" size={18} color={colors.error} />
                  </TouchableOpacity>
                  <Text style={[styles.counterText, { color: colors.text }]}>
                    {goal.current} / {goal.target > 0 ? goal.target : '∞'}
                  </Text>
                  <TouchableOpacity onPress={() => updateProgress(goal.id, 1)} style={[styles.counterBtn, { backgroundColor: colors.primary + '20' }]}>
                    <Icon name="add" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.progressText, { color: colors.primary }]}>
                  {goal.progress}%
                </Text>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={[styles.addButton, { borderColor: colors.cardBorder }]}
          onPress={() => setModalVisible(true)}
        >
          <Icon name="add" size={24} color={colors.textSecondary} />
          <Text style={[styles.addButtonText, { color: colors.textSecondary }]}>Добавить цель</Text>
        </TouchableOpacity>

      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Новая цель</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Название цели"
              placeholderTextColor={colors.textMuted}
              value={newGoalText}
              onChangeText={setNewGoalText}
              autoFocus
            />
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Целевое число (по умолчанию 100)"
              placeholderTextColor={colors.textMuted}
              value={newGoalTarget}
              onChangeText={setNewGoalTarget}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBtn}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addGoal} style={styles.modalBtn}>
                <Text style={[styles.modalBtnText, { color: colors.primary }]}>Добавить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', fontFamily: 'monospace' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 10, fontSize: 16 },
  card: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  progressBarContainer: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 12 },
  progressBar: { height: 3, borderRadius: 2 },
  notesInput: { fontSize: 14, lineHeight: 20, fontStyle: 'italic', marginBottom: 12, padding: 0 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counterContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  counterText: { fontSize: 16, fontWeight: '600', fontFamily: 'monospace' },
  progressText: { fontSize: 14, fontWeight: '600' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', gap: 8, marginTop: 10 },
  addButtonText: { fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', padding: 20, borderRadius: 16, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
  modalBtn: { padding: 8 },
  modalBtnText: { fontSize: 16, fontWeight: '600' },
});