import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Alert,
  PanResponder
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Svg, { Line, Circle, G, Text as SvgText } from 'react-native-svg';
import API from '../api/config';

const { width, height } = Dimensions.get('window');

const KnowledgeGraphScreen = () => {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState({});
  const [progress, setProgress] = useState({});

  // Для перемещения графа
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      }
    })
  ).current;

  // Анимации
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Пробуем загрузить с бэкенда
      const progressResponse = await API.get('/user/progress').catch(() => null);
      
      if (progressResponse && progressResponse.data) {
        setProgress(progressResponse.data);
        setGraphData(generateHierarchicalGraph(progressResponse.data));
      } else {
        // Если бэкенд недоступен, используем тестовые данные
        const mockProgress = generateMockProgress();
        setProgress(mockProgress);
        setGraphData(generateHierarchicalGraph(mockProgress));
      }
    } catch (error) {
      console.error('Ошибка загрузки графа, используем тестовые данные:', error);
      const mockProgress = generateMockProgress();
      setProgress(mockProgress);
      setGraphData(generateHierarchicalGraph(mockProgress));
    } finally {
      setLoading(false);
    }
  };

  const generateMockProgress = () => {
    return {
      topics: {
        greetings: { total: 50, learned: 45, inProgress: 3 },
        farewells: { total: 30, learned: 28, inProgress: 2 },
        time: { total: 40, learned: 20, inProgress: 10 },
        family: { total: 35, learned: 12, inProgress: 8 },
        food: { total: 45, learned: 30, inProgress: 10 },
        travel: { total: 25, learned: 5, inProgress: 5 },
      },
      totalWords: 225,
      learnedWords: 140
    };
  };

  const generateHierarchicalGraph = (progressData) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 120;

    const topics = [
      { id: 'topic1', name: 'Приветствия', category: 'greetings', icon: 'handshake' },
      { id: 'topic2', name: 'Прощания', category: 'farewells', icon: 'wave' },
      { id: 'topic3', name: 'Время', category: 'time', icon: 'schedule' },
      { id: 'topic4', name: 'Семья', category: 'family', icon: 'family-restroom' },
      { id: 'topic5', name: 'Еда', category: 'food', icon: 'restaurant' },
      { id: 'topic6', name: 'Путешествия', category: 'travel', icon: 'flight' },
    ];

    return topics.map((topic, index) => {
      const topicProgress = progressData.topics[topic.category] || { learned: 0, total: 50 };
      const progressPercent = (topicProgress.learned / topicProgress.total) * 100;
      
      const baseSize = 70;
      const maxSize = 130;
      const size = baseSize + (maxSize - baseSize) * (progressPercent / 100);
      
      const angle = (index / topics.length) * Math.PI * 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      return {
        ...topic,
        type: 'topic',
        x,
        y,
        size,
        progress: progressPercent,
        learned: topicProgress.learned,
        total: topicProgress.total,
        expanded: expandedTopics[topic.id] || false
      };
    });
  };

  const toggleTopic = (topicId) => {
    setExpandedTopics({
      ...expandedTopics,
      [topicId]: !expandedTopics[topicId]
    });
  };

  const getTopicColor = (category, progress) => {
    const colors = {
      greetings: '#4CAF50',
      farewells: '#FF9800',
      time: '#2196F3',
      family: '#9C27B0',
      food: '#F44336',
      travel: '#00BCD4',
    };
    return colors[category] || '#9C27B0';
  };

  const handleZoomIn = () => {
    Animated.spring(scale, {
      toValue: scale._value + 0.2,
      useNativeDriver: true,
    }).start();
  };

  const handleZoomOut = () => {
    Animated.spring(scale, {
      toValue: Math.max(scale._value - 0.2, 0.5),
      useNativeDriver: true,
    }).start();
  };

  const handleReset = () => {
    Animated.parallel([
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <Icon name="device-hub" size={80} color="#4CAF50" />
          <Text style={styles.loadingText}>Загружаем граф знаний...</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🗺️ Граф знаний</Text>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>
            {progress.learnedWords || 0}/{progress.totalWords || 225} слов
          </Text>
        </View>
      </View>

      <ScrollView horizontal style={styles.legendContainer} showsHorizontalScrollIndicator={false}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Приветствия</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.legendText}>Прощания</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
          <Text style={styles.legendText}>Время</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#9C27B0' }]} />
          <Text style={styles.legendText}>Семья</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
          <Text style={styles.legendText}>Еда</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#00BCD4' }]} />
          <Text style={styles.legendText}>Путешествия</Text>
        </View>
      </ScrollView>

      <View style={styles.graphContainer}>
        <Animated.View
          style={[
            styles.graphContent,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { scale: scale }
              ]
            }
          ]}
          {...panResponder.panHandlers}
        >
          <Svg width={width * 2} height={height * 2}>
            {graphData?.map((topic) => (
              <G key={topic.id}>
                <Circle
                  cx={topic.x}
                  cy={topic.y}
                  r={topic.size / 2}
                  fill={getTopicColor(topic.category, topic.progress)}
                  stroke="#fff"
                  strokeWidth="4"
                  onPress={() => toggleTopic(topic.id)}
                />
                <SvgText
                  x={topic.x}
                  y={topic.y - 15}
                  fontSize="20"
                  fill="white"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {topic.name ? topic.name.charAt(0) : ''}
                </SvgText>
                <SvgText
                  x={topic.x}
                  y={topic.y + 10}
                  fontSize="10"
                  fill="white"
                  textAnchor="middle"
                >
                  {topic.name}
                </SvgText>
                <SvgText
                  x={topic.x}
                  y={topic.y + 30}
                  fontSize="8"
                  fill="white"
                  textAnchor="middle"
                >
                  {topic.learned}/{topic.total}
                </SvgText>
              </G>
            ))}
          </Svg>
        </Animated.View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn}>
          <Icon name="zoom-in" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleZoomOut}>
          <Icon name="zoom-out" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleReset}>
          <Icon name="center-focus-strong" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  progressBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  legendContainer: {
    padding: 12,
    backgroundColor: '#fff',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  graphContainer: {
    flex: 1,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  graphContent: {
    width: width * 2,
    height: height * 2,
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlButton: {
    padding: 10,
  },
});

export default KnowledgeGraphScreen;