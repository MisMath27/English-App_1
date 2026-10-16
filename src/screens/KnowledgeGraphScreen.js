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

const DEFAULT_SETTINGS = {
  lineWidth: 1.5,
  repulsion: 300,
  gravity: 0.1,
  edgeLength: 120,
};

const STORAGE_KEY = '@graph_data_v1';

export default function KnowledgeGraphScreen() {
  const { colors, isDarkMode, fontSizeMultiplier } = useTheme();
  const { t } = useTranslation();
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const [nodes, setNodes] = useState(DEFAULT_NODES);
  const [links, setLinks] = useState(DEFAULT_LINKS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

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
        console.warn('Failed to load graph:', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const save = useCallback(async (n, l, s) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: n, links: l, settings: s }));
    } catch (e) {
      console.warn('Failed to save graph:', e);
    }
  }, []);

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
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: s.lineWidth + 1.5 },
            itemStyle: {
              color: 'transparent',
              borderColor: nodeBorderColor,
              borderWidth: 4,
            },
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
    }
    chart.setOption(buildOption(nodes, links, settings), true);
  }, [loaded, nodes, links, settings, buildOption]);

  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  const addNode = () => {
    const name = nodeName.trim();
    if (!name) return;
    if (nodes.some((n) => n.name === name)) { setNodeName(''); setNodeModal(false); return; }
    const next = [...nodes, { name, symbolSize: 30 }];
    setNodes(next); save(next, links, settings);
    setNodeName(''); setNodeModal(false);
  };

  const removeNode = (name) => {
    const nextNodes = nodes.filter((n) => n.name !== name);
    const nextLinks = links.filter((l) => l.source !== name && l.target !== name);
    setNodes(nextNodes); setLinks(nextLinks); save(nextNodes, nextLinks, settings);
  };

  const addLink = () => {
    const from = linkFrom.trim();
    const to = linkTo.trim();
    if (!from || !to || from === to) return;
    if (!nodes.some((n) => n.name === from)) return;
    if (!nodes.some((n) => n.name === to)) return;
    if (links.some((l) => l.source === from && l.target === to)) { setLinkFrom(''); setLinkTo(''); setLinkModal(false); return; }
    const next = [...links, { source: from, target: to }];
    setLinks(next); save(nodes, next, settings);
    setLinkFrom(''); setLinkTo(''); setLinkModal(false);
  };

  const removeLink = (link) => {
    const next = links.filter((l) => !(l.source === link.source && l.target === link.target));
    setLinks(next); save(nodes, next, settings);
  };

  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next); save(nodes, links, next);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, fontSize: 22 * fontSizeMultiplier }]}>
          {t('graph_title')}
        </Text>
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}
            onPress={() => setNodeModal(true)}
          >
            <Text style={[styles.btnText, { color: colors.text, fontSize: 13 * fontSizeMultiplier }]}>
              {t('graph_add_node')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}
            onPress={() => setLinkModal(true)}
          >
            <Text style={[styles.btnText, { color: colors.text, fontSize: 13 * fontSizeMultiplier }]}>
              {t('graph_add_link')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}
            onPress={() => setSettingsModal(true)}
          >
            <Text style={[styles.btnText, { color: colors.text, fontSize: 13 * fontSizeMultiplier }]}>
              {t('graph_settings')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <SvgChart ref={chartRef} style={styles.chart} />

      {/* Модалка: новый узел */}
      <Modal visible={nodeModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 * fontSizeMultiplier }]}>
              {t('graph_new_node')}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder, fontSize: 15 * fontSizeMultiplier }]}
              placeholder={t('graph_name_placeholder')}
              placeholderTextColor={colors.textMuted}
              value={nodeName}
              onChangeText={setNodeName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setNodeModal(false)}>
                <Text style={[styles.cancel, { color: colors.textSecondary, fontSize: 15 * fontSizeMultiplier }]}>
                  {t('cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addNode}>
                <Text style={[styles.confirm, { color: colors.primary, fontSize: 15 * fontSizeMultiplier }]}>
                  {t('add')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка: новая связь */}
      <Modal visible={linkModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 * fontSizeMultiplier }]}>
              {t('graph_new_link')}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder, fontSize: 15 * fontSizeMultiplier }]}
              placeholder={t('graph_from_placeholder')}
              placeholderTextColor={colors.textMuted}
              value={linkFrom}
              onChangeText={setLinkFrom}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder, fontSize: 15 * fontSizeMultiplier }]}
              placeholder={t('graph_to_placeholder')}
              placeholderTextColor={colors.textMuted}
              value={linkTo}
              onChangeText={setLinkTo}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setLinkModal(false)}>
                <Text style={[styles.cancel, { color: colors.textSecondary, fontSize: 15 * fontSizeMultiplier }]}>
                  {t('cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addLink}>
                <Text style={[styles.confirm, { color: colors.primary, fontSize: 15 * fontSizeMultiplier }]}>
                  {t('add')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка: настройки графа */}
      <Modal visible={settingsModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder, maxHeight: '80%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 * fontSizeMultiplier }]}>
                {t('graph_settings_title')}
              </Text>

              <Text style={[styles.section, { color: colors.textSecondary, fontSize: 12 * fontSizeMultiplier }]}>
                {t('graph_physics')}
              </Text>
              <SliderRow label={t('graph_repulsion')} value={settings.repulsion} min={50} max={2000} step={50} onChange={(v) => updateSetting('repulsion', v)} multiplier={fontSizeMultiplier} colors={colors} />
              <SliderRow label={t('graph_gravity')} value={settings.gravity} min={0} max={1} step={0.05} onChange={(v) => updateSetting('gravity', v)} multiplier={fontSizeMultiplier} colors={colors} />
              <SliderRow label={t('graph_edge_length')} value={settings.edgeLength} min={30} max={400} step={10} onChange={(v) => updateSetting('edgeLength', v)} multiplier={fontSizeMultiplier} colors={colors} />

              <Text style={[styles.section, { color: colors.textSecondary, fontSize: 12 * fontSizeMultiplier }]}>
                {t('graph_line_style')}
              </Text>
              <SliderRow label={t('graph_line_width')} value={settings.lineWidth} min={0.5} max={8} step={0.5} onChange={(v) => updateSetting('lineWidth', v)} multiplier={fontSizeMultiplier} colors={colors} />

              <Text style={[styles.section, { color: colors.textSecondary, fontSize: 12 * fontSizeMultiplier }]}>
                {t('graph_nodes_list')}
              </Text>
              {nodes.map((n) => (
                <View key={n.name} style={[styles.row, { borderBottomColor: colors.cardBorder }]}>
                  <Text style={[styles.rowText, { color: colors.text, fontSize: 14 * fontSizeMultiplier }]}>{n.name}</Text>
                  <TouchableOpacity onPress={() => removeNode(n.name)}>
                    <Text style={[styles.delete, { fontSize: 13 * fontSizeMultiplier }]}>{t('delete')}</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <Text style={[styles.section, { color: colors.textSecondary, fontSize: 12 * fontSizeMultiplier }]}>
                {t('graph_links_list')}
              </Text>
              {links.map((l, i) => (
                <View key={`${l.source}-${l.target}-${i}`} style={[styles.row, { borderBottomColor: colors.cardBorder }]}>
                  <Text style={[styles.rowText, { color: colors.text, fontSize: 14 * fontSizeMultiplier }]}>
                    {l.source} → {l.target}
                  </Text>
                  <TouchableOpacity onPress={() => removeLink(l)}>
                    <Text style={[styles.delete, { fontSize: 13 * fontSizeMultiplier }]}>{t('delete')}</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
                onPress={() => setSettingsModal(false)}
              >
                <Text style={[styles.confirmBtnText, { fontSize: 15 * fontSizeMultiplier }]}>
                  {t('graph_done')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SliderRow({ label, value, min, max, step, onChange, multiplier, colors }) {
  const decrease = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const increase = () => onChange(Math.min(max, +(value + step).toFixed(2)));

  return (
    <View style={styles.sliderRow}>
      <Text style={[styles.sliderLabel, { color: colors.text, fontSize: 14 * multiplier }]}>{label}</Text>
      <View style={styles.sliderControls}>
        <TouchableOpacity
          style={[styles.sliderBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
          onPress={decrease}
        >
          <Text style={[styles.sliderBtnText, { color: colors.text }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.sliderValue, { color: colors.text, fontSize: 14 * multiplier }]}>{value}</Text>
        <TouchableOpacity
          style={[styles.sliderBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
          onPress={increase}
        >
          <Text style={[styles.sliderBtnText, { color: colors.text }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontWeight: '700' },
  toolbar: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnText: { fontWeight: '600' },
  chart: { flex: 1 },

  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: { fontWeight: '700', marginBottom: 16 },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    marginTop: 8,
  },
  cancel: {},
  confirm: { fontWeight: '700' },

  section: {
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
  },
  rowText: {},
  delete: { color: '#ef4444', fontWeight: '600' },

  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderLabel: {},
  sliderControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  sliderBtnText: { fontSize: 18, fontWeight: '700' },
  sliderValue: { minWidth: 50, textAlign: 'center' },

  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: { fontWeight: '700' },
});