import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, Modal,
  TextInput, ScrollView, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';
import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';

const { width: SCREEN_W } = Dimensions.get('window');
echarts.use([GraphChart, SVGRenderer]);

const DEFAULT_NODES = [
  { name: 'Home', symbolSize: 40 },
  { name: 'Learn', symbolSize: 30 },
  { name: 'Goals', symbolSize: 30 },
  { name: 'Graph', symbolSize: 35 },
  { name: 'Settings', symbolSize: 28 },
];

const DEFAULT_LINKS = [
  { source: 'Home', target: 'Learn' },
  { source: 'Home', target: 'Goals' },
  { source: 'Home', target: 'Graph' },
  { source: 'Graph', target: 'Settings' },
];

const DEFAULT_SETTINGS = { lineWidth: 1.5, repulsion: 300, gravity: 0.1, edgeLength: 120 };

const BASE_STORAGE_KEY = '@graph_data_v1';
const BASE_GOALS_KEY = '@english_app:goals';

export default function KnowledgeGraphScreen({ navigation }) {
  const { colors, isDarkMode, fontSizeMultiplier } = useTheme();
  const { t } = useTranslation();
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const [currentUid, setCurrentUid] = useState(null);
  const [nodes, setNodes] = useState(DEFAULT_NODES);
  const [links, setLinks] = useState(DEFAULT_LINKS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // --- СОСТОЯНИЯ ДЛЯ ЦЕЛЕЙ ---
  const [goals, setGoals] = useState([]); // Все цели пользователя
  const [selectedNodeForGoals, setSelectedNodeForGoals] = useState(null); // Узел, для которого открыто меню
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);

  // Поля для новой цели
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('daily');

  // Модалки графа
  const [nodeModal, setNodeModal] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [linkFrom, setLinkFrom] = useState('');
  const [linkTo, setLinkTo] = useState('');

  const graphBackground = colors.background;
  const lineColor = isDarkMode ? 'rgba(120, 140, 180, 0.5)' : 'rgba(60, 80, 120, 0.45)';
  const labelColor = colors.text;
  const nodeBorderColor = colors.primary;

  // Загрузка графа и целей
  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(async (user) => {
      const uid = user ? user.uid : null;
      setCurrentUid(uid);

      if (!uid) {
        setLoaded(true);
        return;
      }

      const graphKey = `${BASE_STORAGE_KEY}_${uid}`;
      const goalsKey = `${BASE_GOALS_KEY}_${uid}`;

      try {
        // Грузим граф
        const rawGraph = await AsyncStorage.getItem(graphKey);
        if (rawGraph) {
          const parsed = JSON.parse(rawGraph);
          if (parsed.nodes) setNodes(parsed.nodes);
          if (parsed.links) setLinks(parsed.links);
          if (parsed.settings) setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
        } else {
          setNodes(DEFAULT_NODES);
          setLinks(DEFAULT_LINKS);
          setSettings(DEFAULT_SETTINGS);
        }

        // Грузим цели
        const rawGoals = await AsyncStorage.getItem(goalsKey);
        setGoals(rawGoals ? JSON.parse(rawGoals) : []);

      } catch (e) {
        console.warn('Failed to load data:', e);
      } finally {
        setLoaded(true);
      }
    });
    return subscriber;
  }, []);

  // Сохранение графа
  const saveGraph = useCallback(async (n, l, s) => {
    if (!currentUid) return;
    try {
      await AsyncStorage.setItem(`${BASE_STORAGE_KEY}_${currentUid}`, JSON.stringify({ nodes: n, links: l, settings: s }));
    } catch (e) { console.warn(e); }
  }, [currentUid]);

  // Сохранение целей
  const saveGoals = async (newGoals) => {
    if (!currentUid) return;
    try {
      await AsyncStorage.setItem(`${BASE_GOALS_KEY}_${currentUid}`, JSON.stringify(newGoals));
    } catch (e) { console.warn(e); }
  };

  // Отрисовка графа с обработкой кликов
  const buildOption = useCallback(
    (n, l, s) => ({
      backgroundColor: graphBackground,
      series: [
        {
          type: 'graph',
          layout: 'force',
          draggable: true,
          roam: true,
          data: n.map((node) => ({
            ...node,
            itemStyle: {
              color: 'transparent',
              borderColor: nodeBorderColor,
              borderWidth: 3,
            },
            // Добавляем обработчик клика
            emphasis: {
              focus: 'adjacency',
              itemStyle: { borderColor: '#FFD700', borderWidth: 4 } // Подсветка при наведении/клике
            }
          })),
          links: l,
          force: {
            repulsion: s.repulsion,
            gravity: s.gravity,
            edgeLength: s.edgeLength,
            layoutAnimation: true,
          },
          label: {
            show: true,
            position: 'right',
            color: labelColor,
            fontSize: 12 * fontSizeMultiplier,
          },
          lineStyle: {
            color: lineColor,
            width: s.lineWidth,
            curveness: 0.1,
          },
        },
      ],
    }),
    [graphBackground, lineColor, labelColor, nodeBorderColor, fontSizeMultiplier]
  );

  useEffect(() => {
    if (!loaded || !chartRef.current) return;
    let chart = chartInstanceRef.current;
    if (!chart) {
      chart = echarts.init(chartRef.current, 'light', { renderer: 'svg', width: SCREEN_W, height: 600 });
      chartInstanceRef.current = chart;

      // Слушаем клики по графу
      chart.on('click', (params) => {
        if (params.dataType === 'node') {
          // params.name - это имя узла
          handleNodeClick(params.name);
        }
      });
    }
    chart.setOption(buildOption(nodes, links, settings), true);
  }, [loaded, nodes, links, settings, buildOption]);

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  // Обработчик клика по узлу
  const handleNodeClick = (nodeName) => {
    setSelectedNodeForGoals(nodeName);
    // Ищем цели, привязанные к этому узлу
    const nodeGoals = goals.filter(g => g.nodeName === nodeName);
    setShowGoalsModal(true);
  };

  // Добавление цели
  const addGoal = () => {
    if (!newGoalText.trim() || !selectedNodeForGoals) return;

    const newGoal = {
      id: Date.now(),
      nodeName: selectedNodeForGoals, // Привязка к узлу!
      text: newGoalText.trim(),
      category: selectedCategory,
      progress: 0,
      target: parseInt(newGoalTarget, 10) || 0,
      current: 0,
      completed: false,
    };

    const updated = [...goals, newGoal];
    setGoals(updated);
    saveGoals(updated);

    setNewGoalText(''); setNewGoalTarget(''); setSelectedCategory('daily');
    setShowAddGoalModal(false);
  };

  // Удаление цели
  const deleteGoal = (id) => {
    Alert.alert('Удалить цель?', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => {
        const updated = goals.filter(g => g.id !== id);
        setGoals(updated);
        saveGoals(updated);
      }}
    ]);
  };

  // Обновление прогресса цели
  const updateGoalProgress = (id, increment) => {
    const updated = goals.map(g => {
      if (g.id === id) {
        const max = g.target > 0 ? g.target : 9999;
        const newCurrent = Math.max(0, Math.min(g.current + increment, max));
        return {
          ...g,
          current: newCurrent,
          progress: g.target > 0 ? Math.round((newCurrent / g.target) * 100) : 0
        };
      }
      return g;
    });
    setGoals(updated);
    saveGoals(updated);
  };

  // --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ МОДАЛОК ---
  const openNodeModal = () => setNodeModal(true);
  const closeNodeModal = () => setNodeModal(false);
  const addNode = () => {
    const name = nodeName.trim();
    if (!name || nodes.some(n => n.name === name)) return;
    const next = [...nodes, { name, symbolSize: 30 }];
    setNodes(next);
    saveGraph(next, links, settings);
    setNodeName(''); setNodeModal(false);
  };

  const removeNode = (name) => {
    const nextNodes = nodes.filter(n => n.name !== name);
    const nextLinks = links.filter(l => l.source !== name && l.target !== name);
    setNodes(nextNodes); setLinks(nextLinks);
    saveGraph(nextNodes, nextLinks, settings);

    // Удаляем цели этого узла
    const updatedGoals = goals.filter(g => g.nodeName !== name);
    setGoals(updatedGoals);
    saveGoals(updatedGoals);
  };

  // ... (Остальные функции для связей и настроек графа остаются как были, я их пропущу для краткости, но в вашем коде они должны остаться)

  // Получаем цели для выбранного узла
  const currentGoals = selectedNodeForGoals
    ? goals.filter(g => g.nodeName === selectedNodeForGoals)
    : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Заголовок и кнопки */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, fontSize: 22 * fontSizeMultiplier }]}>
          {t('graph_title')}
        </Text>
        <View style={styles.toolbar}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]} onPress={openNodeModal}>
            <Text style={[styles.btnText, { color: colors.text }]}>+ Узел</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]} onPress={() => setSettingsModal(true)}>
             <Text style={[styles.btnText, { color: colors.text }]}>Настройки</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SvgChart ref={chartRef} style={styles.chart} />

      {/* МОДАЛКА: Управление целями выбранного узла */}
      <Modal visible={showGoalsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: 20 * fontSizeMultiplier }]}>
                Цели: {selectedNodeForGoals}
              </Text>
              <TouchableOpacity onPress={() => setShowGoalsModal(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {currentGoals.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 20 }}>
                  <Icon name="flag" size={40} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, marginTop: 10 }}>Нет целей для этого узла</Text>
                </View>
              ) : (
                currentGoals.map(goal => (
                  <GlassCard key={goal.id} style={{ marginBottom: 10, padding: 15 }}>
                    <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>{goal.text}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{goal.category === 'daily' ? 'Ежедневно' : goal.category === 'weekly' ? 'Еженедельно' : 'Ежемесячно'}</Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, justifyContent: 'space-between' }}>
                       <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <TouchableOpacity onPress={() => updateGoalProgress(goal.id, -1)} style={{ backgroundColor: '#E74C3C', borderRadius: 15, padding: 5 }}>
                            <Icon name="remove" size={16} color="#fff" />
                          </TouchableOpacity>
                          <Text style={{ color: colors.text, fontSize: 16 }}>{goal.current} / {goal.target > 0 ? goal.target : '∞'}</Text>
                          <TouchableOpacity onPress={() => updateGoalProgress(goal.id, 1)} style={{ backgroundColor: '#2ECC71', borderRadius: 15, padding: 5 }}>
                            <Icon name="add" size={16} color="#fff" />
                          </TouchableOpacity>
                       </View>
                       <TouchableOpacity onPress={() => deleteGoal(goal.id)}>
                          <Icon name="delete-outline" size={20} color={colors.error} />
                       </TouchableOpacity>
                    </View>
                  </GlassCard>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddGoalModal(true)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ Добавить цель</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* МОДАЛКА: Добавление новой цели */}
      <Modal visible={showAddGoalModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
             <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Новая цель для {selectedNodeForGoals}</Text>
              <TouchableOpacity onPress={() => setShowAddGoalModal(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Название цели"
              placeholderTextColor={colors.textMuted}
              value={newGoalText}
              onChangeText={setNewGoalText}
            />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Целевое число (0 = бесконечно)"
              placeholderTextColor={colors.textMuted}
              value={newGoalTarget}
              onChangeText={setNewGoalTarget}
              keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
              {['daily', 'weekly', 'monthly'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryBtn, selectedCategory === cat && styles.categoryBtnActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={{ color: selectedCategory === cat ? '#fff' : colors.text }}>
                    {cat === 'daily' ? 'День' : cat === 'weekly' ? 'Неделя' : 'Месяц'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={addGoal}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Создать цель</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- ОСТАЛЬНЫЕ МОДАЛКИ (Узел, Связь, Настройки) --- */}
      {/* Они у вас уже есть, просто убедитесь, что кнопки вызова на месте */}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontWeight: '700' },
  toolbar: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  btnText: { fontWeight: '600' },
  chart: { flex: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 16, padding: 20, borderWidth: 1, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontWeight: 'bold' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  addButton: { padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  categoryBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  categoryBtnActive: { backgroundColor: '#2ECC71' },
});