import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';
import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_W } = Dimensions.get('window');

echarts.use([GraphChart, SVGRenderer]);

// ─────────────────────────────────────────────
// ДЕФОЛТНЫЕ ДАННЫЕ И НАСТРОЙКИ
// ─────────────────────────────────────────────
const DEFAULT_NODES = [
  { name: 'Главная', symbolSize: 40 },
  { name: 'Учить', symbolSize: 30 },
  { name: 'Цели', symbolSize: 30 },
  { name: 'Граф знаний', symbolSize: 35 },
  { name: 'Настройки', symbolSize: 28 },
];

const DEFAULT_LINKS = [
  { source: 'Главная', target: 'Учить' },
  { source: 'Главная', target: 'Цели' },
  { source: 'Главная', target: 'Граф знаний' },
  { source: 'Граф знаний', target: 'Настройки' },
];

const DEFAULT_SETTINGS = {
  lineWidth: 1.5,
  lineColor: 'rgba(120, 140, 180, 0.5)',
  nodeColor: '#22c55e',
  repulsion: 300,
  gravity: 0.1,
  edgeLength: 120,
};

const STORAGE_KEY = '@graph_data_v1';

export default function KnowledgeGraphScreen() {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const [nodes, setNodes] = useState(DEFAULT_NODES);
  const [links, setLinks] = useState(DEFAULT_LINKS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // UI-состояния для модалок
  const [nodeModal, setNodeModal] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [nodeName, setNodeName] = useState('');
  const [linkFrom, setLinkFrom] = useState('');
  const [linkTo, setLinkTo] = useState('');

  // ─── ЗАГРУЗКА ИЗ ХРАНИЛИЩА ────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.nodes) setNodes(parsed.nodes);
          if (parsed.links) setLinks(parsed.links);
          if (parsed.settings) setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
        }
      } catch (e) {
        console.warn('Не удалось загрузить граф:', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // ─── СОХРАНЕНИЕ ───────────────────────────────
  const save = useCallback(async (n, l, s) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ nodes: n, links: l, settings: s })
      );
    } catch (e) {
      console.warn('Не удалось сохранить граф:', e);
    }
  }, []);

  // ─── ПОСТРОЕНИЕ ГРАФА ─────────────────────────
  const buildOption = useCallback(
    (n, l, s) => ({
      backgroundColor: '#0b1220',
      series: [
        {
          type: 'graph',
          layout: 'force',
          draggable: true,
          roam: true,
          data: n.map((node) => ({
            ...node,
            itemStyle: { color: s.nodeColor },
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
            color: '#fff',
            fontSize: 12,
          },
          lineStyle: {
            color: s.lineColor,
            width: s.lineWidth,
            curveness: 0.1,
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: s.lineWidth + 1.5 },
          },
        },
      ],
    }),
    []
  );

  // ─── ИНИЦИАЛИЗАЦИЯ ────────────────────────────
  useEffect(() => {
    if (!loaded || !chartRef.current) return;
    let chart = chartInstanceRef.current;
    if (!chart) {
      chart = echarts.init(chartRef.current, 'light', {
        renderer: 'svg',
        width: SCREEN_W,
        height: 600,
      });
      chartInstanceRef.current = chart;
    }
    chart.setOption(buildOption(nodes, links, settings), true);
    return () => {
      // Не dispose'им на каждый ререндер, только при размонтировании
    };
  }, [loaded, nodes, links, settings, buildOption]);

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  // ─── ДЕЙСТВИЯ ─────────────────────────────────
  const addNode = () => {
    const name = nodeName.trim();
    if (!name) return;
    if (nodes.some((n) => n.name === name)) {
      setNodeName('');
      setNodeModal(false);
      return;
    }
    const next = [...nodes, { name, symbolSize: 30 }];
    setNodes(next);
    save(next, links, settings);
    setNodeName('');
    setNodeModal(false);
  };

  const removeNode = (name) => {
    const nextNodes = nodes.filter((n) => n.name !== name);
    const nextLinks = links.filter(
      (l) => l.source !== name && l.target !== name
    );
    setNodes(nextNodes);
    setLinks(nextLinks);
    save(nextNodes, nextLinks, settings);
  };

  const addLink = () => {
    const from = linkFrom.trim();
    const to = linkTo.trim();
    if (!from || !to || from === to) return;
    if (!nodes.some((n) => n.name === from)) return;
    if (!nodes.some((n) => n.name === to)) return;
    if (links.some((l) => l.source === from && l.target === to)) {
      setLinkFrom('');
      setLinkTo('');
      setLinkModal(false);
      return;
    }
    const next = [...links, { source: from, target: to }];
    setLinks(next);
    save(nodes, next, settings);
    setLinkFrom('');
    setLinkTo('');
    setLinkModal(false);
  };

  const removeLink = (link) => {
    const next = links.filter(
      (l) => !(l.source === link.source && l.target === link.target)
    );
    setLinks(next);
    save(nodes, next, settings);
  };

  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    save(nodes, links, next);
  };

  // ─── UI ───────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Граф знаний</Text>
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.btn} onPress={() => setNodeModal(true)}>
            <Text style={styles.btnText}>+ Узел</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => setLinkModal(true)}>
            <Text style={styles.btnText}>+ Связь</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => setSettingsModal(true)}>
            <Text style={styles.btnText}>⚙ Настройки</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SvgChart ref={chartRef} style={styles.chart} />

      {/* ─── МОДАЛКА: ДОБАВИТЬ УЗЕЛ ─── */}
      <Modal visible={nodeModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Новый узел</Text>
            <TextInput
              style={styles.input}
              placeholder="Название"
              placeholderTextColor="#666"
              value={nodeName}
              onChangeText={setNodeName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setNodeModal(false)}>
                <Text style={styles.cancel}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addNode}>
                <Text style={styles.confirm}>Добавить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── МОДАЛКА: ДОБАВИТЬ СВЯЗЬ ─── */}
      <Modal visible={linkModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Новая связь</Text>
            <TextInput
              style={styles.input}
              placeholder="Откуда (имя узла)"
              placeholderTextColor="#666"
              value={linkFrom}
              onChangeText={setLinkFrom}
            />
            <TextInput
              style={styles.input}
              placeholder="Куда (имя узла)"
              placeholderTextColor="#666"
              value={linkTo}
              onChangeText={setLinkTo}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setLinkModal(false)}>
                <Text style={styles.cancel}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addLink}>
                <Text style={styles.confirm}>Добавить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── МОДАЛКА: НАСТРОЙКИ ─── */}
      <Modal visible={settingsModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Настройки графа</Text>

              <Text style={styles.section}>Физика</Text>
              <SliderRow
                label="Отталкивание"
                value={settings.repulsion}
                min={50}
                max={2000}
                step={50}
                onChange={(v) => updateSetting('repulsion', v)}
              />
              <SliderRow
                label="Гравитация"
                value={settings.gravity}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => updateSetting('gravity', v)}
              />
              <SliderRow
                label="Длина связи"
                value={settings.edgeLength}
                min={30}
                max={400}
                step={10}
                onChange={(v) => updateSetting('edgeLength', v)}
              />

              <Text style={styles.section}>Стиль линий</Text>
              <SliderRow
                label="Толщина"
                value={settings.lineWidth}
                min={0.5}
                max={8}
                step={0.5}
                onChange={(v) => updateSetting('lineWidth', v)}
              />

              <Text style={styles.section}>Список узлов</Text>
              {nodes.map((n) => (
                <View key={n.name} style={styles.row}>
                  <Text style={styles.rowText}>{n.name}</Text>
                  <TouchableOpacity onPress={() => removeNode(n.name)}>
                    <Text style={styles.delete}>Удалить</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <Text style={styles.section}>Список связей</Text>
              {links.map((l, i) => (
                <View key={`${l.source}-${l.target}-${i}`} style={styles.row}>
                  <Text style={styles.rowText}>
                    {l.source} → {l.target}
                  </Text>
                  <TouchableOpacity onPress={() => removeLink(l)}>
                    <Text style={styles.delete}>Удалить</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.confirmBtn, { marginTop: 16 }]}
                onPress={() => setSettingsModal(false)}
              >
                <Text style={styles.confirmBtnText}>Готово</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────
// ПРОСТОЙ СЛАЙДЕР (без сторонних библиотек)
// ─────────────────────────────────────────────
function SliderRow({ label, value, min, max, step, onChange }) {
  const decrease = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const increase = () => onChange(Math.min(max, +(value + step).toFixed(2)));

  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <View style={styles.sliderControls}>
        <TouchableOpacity style={styles.sliderBtn} onPress={decrease}>
          <Text style={styles.sliderBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.sliderValue}>{value}</Text>
        <TouchableOpacity style={styles.sliderBtn} onPress={increase}>
          <Text style={styles.sliderBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// СТИЛИ
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220' },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  toolbar: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  btn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: { color: '#c5cdd9', fontSize: 13, fontWeight: '600' },
  chart: { flex: 1 },

  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#111a2e',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#0b1220',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    marginTop: 8,
  },
  cancel: { color: '#94a3b8', fontSize: 15 },
  confirm: { color: '#22c55e', fontSize: 15, fontWeight: '700' },

  section: {
    color: '#7a8699',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  rowText: { color: '#c5cdd9', fontSize: 14 },
  delete: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderLabel: { color: '#c5cdd9', fontSize: 14 },
  sliderControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderBtn: {
    backgroundColor: '#1e293b',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sliderValue: {
    color: '#fff',
    fontSize: 14,
    minWidth: 50,
    textAlign: 'center',
  },

  confirmBtn: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#0b1220', fontWeight: '700', fontSize: 15 },
});