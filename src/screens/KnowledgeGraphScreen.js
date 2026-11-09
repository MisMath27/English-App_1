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

  // Загрузка графа
  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(async (user) => {
      const uid = user ? user.uid : null;
      setCurrentUid(uid);

      if (!uid) {
        setLoaded(true);
        return;
      }

      const graphKey = `${BASE_STORAGE_KEY}_${uid}`;

      try {
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
      } catch (e) {
        console.warn('Failed to load graph:', e);
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
            emphasis: {
              focus: 'adjacency',
              itemStyle: { borderColor: '#FFD700', borderWidth: 4 }
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

  const handleNodeClick = (nodeName) => {
      navigation.navigate('GoalDetailScreen', { nodeName });
    };

    // Потом useEffect, который её использует
    useEffect(() => {
      if (!loaded || !chartRef.current) return;
      let chart = chartInstanceRef.current;
      if (!chart) {
        chart = echarts.init(chartRef.current, 'light', { renderer: 'svg', width: SCREEN_W, height: 600 });
        chartInstanceRef.current = chart;

        chart.on('click', (params) => {
          if (params.dataType === 'node') {
            handleNodeClick(params.name); // теперь функция определена выше
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
  };

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

      {/* --- ОСТАЛЬНЫЕ МОДАЛКИ (Узел, Связь, Настройки) --- */}
      <Modal visible={nodeModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
             <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Новый узел</Text>
              <TouchableOpacity onPress={closeNodeModal}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Название узла"
              placeholderTextColor={colors.textMuted}
              value={nodeName}
              onChangeText={setNodeName}
            />
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={addNode}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Создать</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
});