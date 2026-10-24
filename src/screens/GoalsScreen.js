import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, FlatList,
  Alert, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';

const BASE_GOALS_KEY = '@english_app:goals';

const GoalsScreen = () => {
  const { colors, fontSizeMultiplier } = useTheme();
  const { t } = useTranslation();

  const [currentUid, setCurrentUid] = useState(null);
  const [goals, setGoals] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('daily');
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);



  const getKey = (uid) => uid ? `${BASE_GOALS_KEY}_${uid}` : `${BASE_GOALS_KEY}_guest`;

  useFocusEffect(
    useCallback(() => {
      const user = auth().currentUser;
      const uid = user ? user.uid : null;
      setCurrentUid(uid);
      if (uid) {
        loadGoals(uid);
      } else {
        setIsLoading(false);
      }
    }, [])
  );

  const loadGoals = async (uid) => {
    try {
      setIsLoading(true);
      const saved = await AsyncStorage.getItem(`@english_app:goals_${uid}`);
      setGoals(saved ? JSON.parse(saved) : []);
    } catch (e) { console.log('Error loading goals:', e); }
    finally { setIsLoading(false); }
  };

  // В функции saveGoals:
  const saveGoals = async (newGoals) => {
    if (!currentUid) return;
    try { await AsyncStorage.setItem(`@english_app:goals_${currentUid}`, JSON.stringify(newGoals)); }
    catch (e) { console.log('Error saving goals:', e); }
  };

  const addGoal = () => {
    if (!newGoalText.trim()) { Alert.alert(t('goals_error'), t('goals_enter_text')); return; }
    const targetValue = parseInt(newGoalTarget, 10) || 0;
    const newGoal = {
      id: Date.now(),
      text: newGoalText.trim(),
      category: selectedCategory,
      progress: 0,
      target: targetValue,
      current: 0,
      icon: getCategoryIcon(selectedCategory),
      color: getCategoryColor(selectedCategory),
      createdAt: new Date().toISOString(),
      completed: false,
    };
    const updated = [...goals, newGoal];
    setGoals(updated); saveGoals(updated);
    setNewGoalText(''); setNewGoalTarget(''); setSelectedCategory('daily');
    setShowAddModal(false);
    Alert.alert(t('goals_success'), t('goals_added'));
  };

  const deleteGoal = (id) => {
    Alert.alert(t('goals_delete_confirm'), t('goals_delete_desc'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive',
        onPress: () => {
          const updated = goals.filter((g) => g.id !== id);
          setGoals(updated); saveGoals(updated);
        },
      },
    ]);
  };

  const toggleComplete = (id) => {
    const updated = goals.map((g) => g.id === id ? { ...g, completed: !g.completed } : g);
    setGoals(updated); saveGoals(updated);
  };

  const updateProgress = (id, increment) => {
    const updated = goals.map((g) => {
      if (g.id === id) {
        const max = g.target > 0 ? g.target : 9999;
        const newCurrent = Math.max(0, Math.min(g.current + increment, max));
        const newProgress = g.target > 0
          ? Math.round((newCurrent / g.target) * 100)
          : Math.min(newCurrent * 5, 100);
        return { ...g, current: newCurrent, progress: newProgress };
      }
      return g;
    });
    setGoals(updated); saveGoals(updated);
  };

  const getCategoryIcon = (c) => ({ daily: 'today', weekly: 'date-range', monthly: 'calendar-today' }[c] || 'flag');
  const getCategoryColor = (c) => ({ daily: '#2ECC71', weekly: '#3498DB', monthly: '#F39C12' }[c] || '#9B59B6');
  const getCategoryLabel = (c) => ({
    daily: t('goals_cat_daily'),
    weekly: t('goals_cat_weekly'),
    monthly: t('goals_cat_monthly'),
  }[c] || '');
  const getCategoryEmoji = (c) => ({ daily: '', weekly: '', monthly: '' }[c] || '');

  const getStats = () => {
    const total = goals.length;
    const completed = goals.filter((g) => g.completed).length;
    const inProgress = goals.filter((g) => !g.completed && g.progress > 0).length;
    const notStarted = goals.filter((g) => !g.completed && g.progress === 0).length;
    return { total, completed, inProgress, notStarted };
  };

  const stats = getStats();

  const renderGoalItem = ({ item }) => (
    <GlassCard style={styles.goalCard}>
      <View style={styles.goalCardHeader}>
        <View style={[styles.goalIconContainer, { backgroundColor: item.color + '20' }]}>
          <Icon name={item.icon} size={24} color={item.color} />
        </View>
        <View style={styles.goalCategoryBadge}>
          <Text style={[styles.goalCategoryText, { color: colors.textSecondary, fontSize: 11 * fontSizeMultiplier }]}>
            {getCategoryEmoji(item.category)} {getCategoryLabel(item.category)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => { setSelectedGoal(item); setShowDetailModal(true); }}>
          <Icon name="more-vert" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.goalText, item.completed && styles.goalTextCompleted, { color: colors.text, fontSize: 16 * fontSizeMultiplier }]}>
        {item.text}
      </Text>

      <View style={styles.goalProgressContainer}>
        <View style={styles.goalProgressBar}>
          <View style={[styles.goalProgressFill, { width: `${Math.min(item.progress, 100)}%`, backgroundColor: item.completed ? colors.primary : item.color }]} />
        </View>
        <Text style={[styles.goalProgressText, { color: colors.textSecondary, fontSize: 12 * fontSizeMultiplier }]}>
          {item.completed ? '' : `${Math.min(item.progress, 100)}%`}
        </Text>
      </View>

      <View style={styles.goalCounter}>
        <TouchableOpacity style={[styles.goalCounterBtn, styles.goalCounterBtnMinus]} onPress={() => updateProgress(item.id, -1)}>
          <Icon name="remove" size={16} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.goalCounterText, { color: colors.text, fontSize: 15 * fontSizeMultiplier }]}>
          {item.current} / {item.target > 0 ? item.target : '∞'}
        </Text>
        <TouchableOpacity style={[styles.goalCounterBtn, { backgroundColor: item.color }]} onPress={() => updateProgress(item.id, 1)}>
          <Icon name="add" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.goalCardFooter}>
        <TouchableOpacity style={styles.goalCheckBtn} onPress={() => toggleComplete(item.id)}>
          <Icon name={item.completed ? 'check-circle' : 'radio-button-unchecked'} size={20} color={item.completed ? colors.primary : colors.textSecondary} />
          <Text style={[styles.goalCheckText, { color: item.completed ? colors.primary : colors.textSecondary, fontSize: 13 * fontSizeMultiplier }]}>
            {item.completed ? t('goals_done') : t('goals_mark_done')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.goalDeleteBtn} onPress={() => deleteGoal(item.id)}>
          <Icon name="delete-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </GlassCard>
  );

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Icon name="track-changes" size={60} color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: 16 * fontSizeMultiplier }]}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent={false} />

      <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <Text style={[styles.headerTitle, { fontSize: 28 * fontSizeMultiplier }]}>{t('goals_title')}</Text>
        <Text style={[styles.headerSubtitle, { fontSize: 14 * fontSizeMultiplier }]}>
          {stats.total} {t('goals_total')} • {stats.completed} {t('goals_completed')}
        </Text>
      </LinearGradient>

      {goals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="flag" size={60} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary, fontSize: 20 * fontSizeMultiplier }]}>{t('goals_none')}</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted, fontSize: 14 * fontSizeMultiplier }]}>{t('goals_add_first')}</Text>
        </View>
      ) : (
        <>
          <GlassCard style={[styles.statsContainer, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            {['total', 'completed', 'inProgress', 'notStarted'].map((key, i) => (
              <React.Fragment key={key}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, {
                    fontSize: 22 * fontSizeMultiplier,
                    color: key === 'completed' ? colors.primary :
                           key === 'inProgress' ? colors.warning :
                           key === 'notStarted' ? colors.secondary : colors.text,
                  }]}>
                    {stats[key]}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 11 * fontSizeMultiplier }]}>
                    {key === 'total' ? t('goals_stats_total') :
                     key === 'completed' ? t('goals_stats_completed') :
                     key === 'inProgress' ? t('goals_stats_progress') : t('goals_stats_not_started')}
                  </Text>
                </View>
                {i < 3 && <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />}
              </React.Fragment>
            ))}
          </GlassCard>

          <FlatList data={goals} keyExtractor={(item) => item.id.toString()} renderItem={renderGoalItem} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} />
        </>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.fabGradient}>
          <Icon name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal animationType="slide" transparent visible={showAddModal} onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: 20 * fontSizeMultiplier }]}>{t('goals_new')}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary, fontSize: 14 * fontSizeMultiplier }]}>{t('goals_name')}</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder, fontSize: 16 * fontSizeMultiplier }]}
              placeholder={t('goals_name_placeholder')}
              placeholderTextColor={colors.textMuted}
              value={newGoalText}
              onChangeText={setNewGoalText}
              multiline
            />

            <Text style={[styles.modalLabel, { color: colors.textSecondary, fontSize: 14 * fontSizeMultiplier }]}>{t('goals_target')}</Text>
            <TextInput
              style={[styles.modalInputSmall, { color: colors.text, borderColor: colors.cardBorder, fontSize: 16 * fontSizeMultiplier }]}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={newGoalTarget}
              onChangeText={(text) => setNewGoalTarget(text.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
            />

            <Text style={[styles.modalLabel, { color: colors.textSecondary, fontSize: 14 * fontSizeMultiplier }]}>{t('goals_category')}</Text>
            <View style={styles.categorySelector}>
              {['daily', 'weekly', 'monthly'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryOption, selectedCategory === cat && styles.categoryOptionActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.categoryOptionText, selectedCategory === cat && styles.categoryOptionTextActive, { fontSize: 12 * fontSizeMultiplier }]}>
                    {getCategoryEmoji(cat)} {getCategoryLabel(cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setShowAddModal(false)}>
                <Text style={[styles.modalBtnCancelText, { color: colors.textSecondary, fontSize: 16 * fontSizeMultiplier }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnAdd]} onPress={addGoal}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.modalBtnGradient}>
                  <Text style={[styles.modalBtnAddText, { fontSize: 16 * fontSizeMultiplier }]}>{t('add')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="slide" transparent visible={showDetailModal} onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            {selectedGoal && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text, fontSize: 20 * fontSizeMultiplier }]}>{t('goals_details')}</Text>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                    <Icon name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailContent}>
                  <View style={[styles.detailIconContainer, { backgroundColor: selectedGoal.color + '20' }]}>
                    <Icon name={selectedGoal.icon} size={40} color={selectedGoal.color} />
                  </View>
                  <Text style={[styles.detailText, { color: colors.text, fontSize: 18 * fontSizeMultiplier }]}>{selectedGoal.text}</Text>
                  <Text style={[styles.detailCategory, { color: colors.textSecondary, fontSize: 14 * fontSizeMultiplier }]}>
                    {getCategoryEmoji(selectedGoal.category)} {getCategoryLabel(selectedGoal.category)}
                  </Text>

                  <View style={styles.detailProgress}>
                    <Text style={[styles.detailProgressLabel, { color: colors.textSecondary, fontSize: 14 * fontSizeMultiplier }]}>{t('goals_progress_label')}</Text>
                    <View style={styles.detailProgressBar}>
                      <View style={[styles.detailProgressFill, { width: `${Math.min(selectedGoal.progress, 100)}%`, backgroundColor: selectedGoal.completed ? colors.primary : selectedGoal.color }]} />
                    </View>
                    <Text style={[styles.detailProgressText, { color: colors.textSecondary, fontSize: 14 * fontSizeMultiplier }]}>
                      {selectedGoal.completed ? t('goals_done') : `${Math.min(selectedGoal.progress, 100)}%`}
                    </Text>
                  </View>

                  <View style={styles.detailTarget}>
                    <Text style={[styles.detailTargetLabel, { color: colors.textSecondary, fontSize: 16 * fontSizeMultiplier }]}>
                      {selectedGoal.current} / {selectedGoal.target > 0 ? selectedGoal.target : '∞'}
                    </Text>
                  </View>

                  <View style={styles.detailActions}>
                    <TouchableOpacity style={[styles.detailBtn, styles.detailBtnComplete]} onPress={() => { toggleComplete(selectedGoal.id); setShowDetailModal(false); }}>
                      <Icon name="check" size={20} color="#fff" />
                      <Text style={[styles.detailBtnText, { fontSize: 14 * fontSizeMultiplier }]}>
                        {selectedGoal.completed ? t('goals_mark_undone') : t('goals_mark_done')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.detailBtn, styles.detailBtnDelete]} onPress={() => { deleteGoal(selectedGoal.id); setShowDetailModal(false); }}>
                      <Icon name="delete" size={20} color="#fff" />
                      <Text style={[styles.detailBtnText, { fontSize: 14 * fontSizeMultiplier }]}>{t('goals_delete')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16 },
  header: { marginHorizontal: 16, marginTop: 12, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, borderRadius: 20, overflow: 'hidden' },
  headerTitle: { fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statsContainer: { marginHorizontal: 16, marginTop: 16, marginBottom: 8, paddingVertical: 16, paddingHorizontal: 12, flexDirection: 'row', borderWidth: 1, borderRadius: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontWeight: 'bold' },
  statLabel: { marginTop: 2 },
  statDivider: { width: 1, height: 30 },
  listContainer: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },
  goalCard: { marginBottom: 12, padding: 16, width: '100%', alignSelf: 'center' },
  goalCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  goalIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  goalCategoryBadge: { flex: 1 },
  goalCategoryText: { fontWeight: '500' },
  goalText: { fontWeight: '600', marginBottom: 12 },
  goalTextCompleted: { textDecorationLine: 'line-through', opacity: 0.6 },
  goalProgressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  goalProgressBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginRight: 8 },
  goalProgressFill: { height: '100%', borderRadius: 3 },
  goalProgressText: { fontWeight: '500', minWidth: 40, textAlign: 'right' },
  goalCounter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 16 },
  goalCounterBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  goalCounterBtnMinus: { backgroundColor: '#E74C3C' },
  goalCounterText: { fontWeight: '600', minWidth: 60, textAlign: 'center' },
  goalCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  goalCheckBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalCheckText: {},
  goalDeleteBtn: { padding: 4 },
  fab: { position: 'absolute', bottom: 30, right: 20, borderRadius: 30, overflow: 'hidden' },
  fabGradient: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontWeight: '600', marginTop: 16 },
  emptyText: { marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { borderRadius: 24, width: '100%', maxWidth: 400, padding: 24, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontWeight: 'bold' },
  modalInput: { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
  modalInputSmall: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
  modalLabel: { fontWeight: '600', marginBottom: 8 },
  categorySelector: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  categoryOption: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  categoryOptionActive: { backgroundColor: '#2ECC71' },
  categoryOptionText: { color: '#B0B0C0' },
  categoryOptionTextActive: { color: '#fff', fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 8 },
  modalBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  modalBtnCancel: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, alignItems: 'center' },
  modalBtnCancelText: { fontWeight: '500' },
  modalBtnAdd: { overflow: 'hidden' },
  modalBtnGradient: { padding: 14, alignItems: 'center' },
  modalBtnAddText: { color: '#fff', fontWeight: '600' },
  detailContent: { alignItems: 'center' },
  detailIconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  detailText: { fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  detailCategory: { marginBottom: 16 },
  detailProgress: { width: '100%', marginBottom: 16 },
  detailProgressLabel: { marginBottom: 6 },
  detailProgressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  detailProgressFill: { height: '100%', borderRadius: 4 },
  detailProgressText: { marginTop: 4, textAlign: 'center' },
  detailTarget: { marginBottom: 16 },
  detailTargetLabel: { fontWeight: '600' },
  detailActions: { width: '100%', gap: 8 },
  detailBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  detailBtnComplete: { backgroundColor: '#2ECC71' },
  detailBtnDelete: { backgroundColor: '#E74C3C' },
  detailBtnText: { color: '#fff', fontWeight: '600' },
});

export default GoalsScreen;