import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { LogBox } from 'react-native';

import {
  loadWords,
  saveWords,
  loadPostponedIds,
  savePostponedIds,
  loadSettings,
  loadDailyStats,
  saveDailyStats,
  loadReviewedWords,
  saveReviewedWords,
  loadCelebrationShown,
  saveCelebrationShown,
  updateUserStats,
} from '../utils/progressStorage';

LogBox.ignoreAllLogs();

const { width, height } = Dimensions.get('window');

import WORDS_JSON from '../data/words_with_translation.json';

const VALID_WORDS = WORDS_JSON.filter(item =>
  item.translation &&
  item.translation.trim() !== '' &&
  item.translation !== 'Перевод отсутствует'
);

const DEFAULT_WORDS = VALID_WORDS.map(item => ({
  id: item.id,
  word: item.word,
  translation: item.translation,
  level: item.level || 'A1',
  partOfSpeech: item.partOfSpeech || '',
  example: item.example || '',
  transcription: item.transcription || '',
  reviewCount: 0,
  isLearned: false,
  lastReviewed: null,
}));

const CONFETTI_COLORS = [
  '#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB',
  '#0ABDE3', '#10AC84', '#EE5A24', '#5F27CD',
  '#FF6FB7', '#00D2D3', '#FF9FF3', '#54A0FF',
];

const ConfettiExplosion = ({ count = 100 }) => {
  const particles = useRef([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const centerX = width / 2;
    const centerY = height / 2 - 50;

    particles.current = Array.from({ length: count }, () => {
      const angle = Math.random() * 2 * Math.PI;
      const distance = 150 + Math.random() * 350;
      const size = 6 + Math.random() * 12;

      return {
        x: new Animated.Value(centerX),
        y: new Animated.Value(centerY),
        scale: new Animated.Value(0),
        rotate: new Animated.Value(0),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size,
        isCircle: Math.random() > 0.5,
        endX: centerX + Math.cos(angle) * distance,
        endY: centerY + Math.sin(angle) * distance - 100 + Math.random() * 200,
        duration: 1200 + Math.random() * 800,
        delay: Math.random() * 500,
        rotateSpeed: 360 + Math.random() * 720,
        scaleEnd: 0.5 + Math.random() * 0.8,
      };
    });

    particles.current.forEach((p) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(p.x, { toValue: p.endX, duration: p.duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(p.y, { toValue: p.endY, duration: p.duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(p.rotate, { toValue: p.rotateSpeed, duration: p.duration * 1.2, easing: Easing.linear, useNativeDriver: true }),
          Animated.spring(p.scale, { toValue: p.scaleEnd, friction: 3, tension: 30, useNativeDriver: true }),
        ]).start();
      }, p.delay);
    });

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true })
        .start(() => setIsVisible(false));
    }, 4000);

    return () => {
      clearTimeout(timer);
      particles.current.forEach(p => {
        p.x.stopAnimation();
        p.y.stopAnimation();
        p.rotate.stopAnimation();
        p.scale.stopAnimation();
      });
    };
  }, []);

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.confettiContainer, { opacity: fadeAnim }]} pointerEvents="none">
      {particles.current.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            p.isCircle ? styles.confettiCircle : styles.confettiDiamond,
            {
              backgroundColor: p.color,
              width: p.size,
              height: p.size,
              borderRadius: p.isCircle ? p.size / 2 : 2,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { scale: p.scale },
                {
                  rotate: p.rotate.interpolate({
                    inputRange: [0, 720],
                    outputRange: p.isCircle ? ['0deg', '720deg'] : ['45deg', '765deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </Animated.View>
  );
};

const LearnScreen = ({ route }) => {
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState(route?.params?.tab || 'learn');
  const [wordsPerDay, setWordsPerDay] = useState(30);
  const [reviewCount, setReviewCount] = useState(15);
  const [allWords, setAllWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [todayLearned, setTodayLearned] = useState(0);
  const [todayReviewed, setTodayReviewed] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [celebrationShown, setCelebrationShown] = useState(false);
  const [reviewedWords, setReviewedWords] = useState([]);

  const [sessionWords, setSessionWords] = useState([]);
  const [postponedIds, setPostponedIds] = useState([]);
  const [allShown, setAllShown] = useState(false);
  const [shownCount, setShownCount] = useState(0);
  const [isLearnProcessing, setIsLearnProcessing] = useState(false);

  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const isProcessing = useRef(false);
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    if (!loading && allWords.length > 0 && !isLearnProcessing) {
      generateSession();
    }
  }, [allWords, todayLearned, postponedIds, reviewedWords, reviewCount]);

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const showCelebrationAnimation = (message) => {
    setCelebrationMessage(message);
    setShowCelebration(true);

    Animated.parallel([
      Animated.timing(celebrationOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(celebrationScale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(celebrationOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(celebrationScale, { toValue: 0.5, duration: 500, useNativeDriver: true }),
      ]).start(() => setShowCelebration(false));
    }, 5000);
  };

  const generateSession = useCallback(() => {
    setShowTranslation(false);

    if (activeTab !== 'learn') {
      const learned = allWords.filter(w => w.isLearned && !reviewedWords.includes(w.id));
      const shuffled = shuffleArray(learned);
      const result = shuffled.slice(0, reviewCount);
      setSessionWords(result);
      setCurrentIndex(0);
      setAllShown(false);
      setShownCount(0);
      return;
    }

    const remaining = wordsPerDay - todayLearned;

    if (remaining <= 0) {
      setSessionWords([]);
      if (!celebrationShown && todayLearned >= wordsPerDay) {
        setCelebrationShown(true);
        saveCelebrationShown(true);
        showCelebrationAnimation(`🎉 Выполнена норма в ${wordsPerDay} слов!`);
      }
      return;
    }

    const notLearned = allWords.filter(w => !w.isLearned);
    const postponed = notLearned.filter(w => postponedIds.includes(w.id));
    const others = notLearned.filter(w => !postponedIds.includes(w.id));

    const shuffledOthers = shuffleArray(others);
    const finalList = [...postponed, ...shuffledOthers];
    const result = finalList.slice(0, remaining);

    setSessionWords(result);
    setCurrentIndex(0);
    setAllShown(false);
    setShownCount(0);
  }, [activeTab, allWords, wordsPerDay, reviewCount, todayLearned, postponedIds, celebrationShown, reviewedWords]);

  const getCurrentWord = useCallback(() => {
    if (sessionWords.length === 0) return null;

    if (!allShown) {
      return sessionWords[currentIndex] || sessionWords[0];
    }

    const randomIndex = Math.floor(Math.random() * sessionWords.length);
    return sessionWords[randomIndex] || sessionWords[0];
  }, [sessionWords, currentIndex, allShown]);

  // ⭐ ГЛАВНОЕ ИСПРАВЛЕНИЕ: не затираем прогресс при загрузке
  const loadData = async () => {
    try {
      setLoading(true);
      console.log('📥 НАЧАЛО ЗАГРУЗКИ');

      // 1. Слова
      let words = await loadWords();
      if (words && words.length > 0) {
        console.log('📥 Загружено из кэша:', words.length);
      } else {
        words = DEFAULT_WORDS;
        console.log('📥 Кэша нет, используем DEFAULT_WORDS:', words.length);
        await saveWords(words);
      }
      setAllWords(words);

      // 2. Отложенные
      const postponed = await loadPostponedIds();
      setPostponedIds(postponed);

      // 3. Настройки
      const settings = await loadSettings();
      setWordsPerDay(settings.wordsPerDay || 30);
      setReviewCount(settings.reviewCount || 15);

      // 4. Дневная статистика
      const daily = await loadDailyStats();
      setTodayLearned(daily.learned || 0);
      setTodayReviewed(daily.reviewed || 0);

      // 5. Повторённые слова
      const reviewed = await loadReviewedWords();
      setReviewedWords(reviewed);
      setTodayReviewed(reviewed.length);

      // 6. Поздравление
      const shown = await loadCelebrationShown();
      setCelebrationShown(shown);

      // 7. Обновить статистику пользователя
      await updateUserStats(words);

      console.log('📥 ЗАГРУЗКА ЗАВЕРШЕНА');
    } catch (error) {
      console.log('❌ Ошибка загрузки:', error);
      setAllWords(DEFAULT_WORDS);
      await saveWords(DEFAULT_WORDS);
    } finally {
      setLoading(false);
    }
  };

  const currentWord = getCurrentWord();

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (e, gesture) => {
      pan.setValue({ x: gesture.dx, y: gesture.dy });
      const newScale = 1 - Math.abs(gesture.dx) / (width * 2);
      scale.setValue(Math.max(0.8, newScale));
      rotate.setValue((gesture.dx / width) * 0.2);
    },
    onPanResponderRelease: (e, gesture) => {
      if (Math.abs(gesture.dx) > width * 0.25) {
        const direction = gesture.dx > 0 ? 1 : -1;
        Animated.parallel([
          Animated.timing(pan, { toValue: { x: direction * width * 1.5, y: 0 }, duration: 300, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.7, duration: 300, useNativeDriver: true }),
        ]).start(() => {
          handleSwipe(direction);
          pan.setValue({ x: 0, y: 0 });
          scale.setValue(1);
          rotate.setValue(0);
        });
      } else {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: true }).start();
        Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
        Animated.spring(rotate, { toValue: 0, friction: 5, useNativeDriver: true }).start();
      }
    },
  });

  const handleSwipe = async (direction) => {
    if (!currentWord || isProcessing.current) return;
    isProcessing.current = true;

    setShowTranslation(false);

    const isLearnTab = activeTab === 'learn';
    const isLearning = direction === 1 && isLearnTab;
    const isPostponing = direction === -1 && isLearnTab;

    if (isLearnTab) {
      if (isLearning) {
        setIsLearnProcessing(true);

        const newAllWords = allWords.map(w =>
          w.id === currentWord.id ? { ...w, isLearned: true, lastReviewed: new Date().toISOString() } : w
        );

        const newPostponedIds = postponedIds.filter(id => id !== currentWord.id);

        setAllWords(newAllWords);
        setPostponedIds(newPostponedIds);
        await saveWords(newAllWords);
        await savePostponedIds(newPostponedIds);

        const daily = await saveDailyStats('learn');
        setTodayLearned(daily.learned);

        // Обновляем статистику пользователя
        await updateUserStats(newAllWords);

        if (daily.learned >= wordsPerDay && !celebrationShown) {
          setCelebrationShown(true);
          await saveCelebrationShown(true);
          showCelebrationAnimation(`🎉 Выполнена норма в ${wordsPerDay} слов!`);
        }

        const updatedSession = sessionWords.filter(w => w.id !== currentWord.id);
        setSessionWords(updatedSession);
        setCurrentIndex(0);
        setAllShown(false);
        setShownCount(0);

        setTimeout(() => {
          if (updatedSession.length === 0) generateSession();
          setIsLearnProcessing(false);
          isProcessing.current = false;
        }, 100);

      } else if (isPostponing) {
        const newPostponedIds = [...postponedIds];
        if (!newPostponedIds.includes(currentWord.id)) {
          newPostponedIds.push(currentWord.id);
        }
        setPostponedIds(newPostponedIds);
        await savePostponedIds(newPostponedIds);

        const updatedSession = sessionWords.filter(w => w.id !== currentWord.id);
        setSessionWords(updatedSession);
        setCurrentIndex(0);
        setAllShown(false);
        setShownCount(0);

        setTimeout(() => {
          if (updatedSession.length === 0) generateSession();
          isProcessing.current = false;
        }, 100);
      }

    } else {
      // Вкладка "Повторять"
      const isReviewing = direction === 1;
      if (isReviewing) {
        if (!reviewedWords.includes(currentWord.id)) {
          const newReviewedWords = [...reviewedWords, currentWord.id];
          setReviewedWords(newReviewedWords);
          await saveReviewedWords(newReviewedWords);

          const daily = await saveDailyStats('review');
          setTodayReviewed(newReviewedWords.length);

          // Обновляем статистику пользователя
          await updateUserStats(allWords);
        }

        const updatedSession = sessionWords.filter(w => w.id !== currentWord.id);
        setSessionWords(updatedSession);
        setCurrentIndex(0);
        setAllShown(false);
        setShownCount(0);

        setTimeout(() => {
          if (updatedSession.length === 0) generateSession();
          isProcessing.current = false;
        }, 100);
      } else {
        isProcessing.current = false;
      }
    }
  };

  const toggleTranslation = () => {
    setShowTranslation(!showTranslation);
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setCurrentIndex(0);
    setShowTranslation(false);
    setShowCelebration(false);
    setAllShown(false);
    setShownCount(0);
    pan.setValue({ x: 0, y: 0 });
    scale.setValue(1);
    rotate.setValue(0);
    setTimeout(() => generateSession(), 100);
  };

  const totalLearnedWords = allWords.filter(w => w.isLearned).length;
  const totalWords = allWords.length;
  const hasLearnedWords = totalLearnedWords > 0;
  const allReviewed = hasLearnedWords && allWords.filter(w => w.isLearned).every(w => reviewedWords.includes(w.id));

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Icon name="menu-book" size={60} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Загрузка слов...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Если нет текущего слова
  if (!currentWord) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />

        {showCelebration && (
          <Animated.View
            style={[styles.celebrationOverlay, { opacity: celebrationOpacity, transform: [{ scale: celebrationScale }] }]}
            pointerEvents="none"
          >
            <ConfettiExplosion />
            <View style={styles.celebrationContent}>
              <Icon name="emoji-events" size={70} color="#FFD700" />
              <Text style={[styles.celebrationTitle, { color: colors.text }]}>{celebrationMessage}</Text>
            </View>
          </Animated.View>
        )}

        <View style={styles.tabContainer}>
          {['learn', 'review'].map(tab => {
            const count = tab === 'learn'
              ? allWords.filter(w => !w.isLearned).length
              : allWords.filter(w => w.isLearned && !reviewedWords.includes(w.id)).length;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                onPress={() => switchTab(tab)}
              >
                <Icon name={tab === 'learn' ? 'menu-book' : 'autorenew'} size={20} color={activeTab === tab ? '#fff' : colors.textSecondary} />
                <Text style={[styles.tabText, { color: activeTab === tab ? '#fff' : colors.textSecondary }]}>
                  {tab === 'learn' ? 'Учить' : 'Повторять'}
                </Text>
                <View style={[styles.tabBadge, tab === 'review' && styles.tabBadgeReview]}>
                  <Text style={styles.tabBadgeText}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'learn' && (
          <View style={styles.todayProgressContainer}>
            <View style={styles.todayProgressHeader}>
              <Text style={[styles.todayProgressLabel, { color: colors.textSecondary }]}>Сегодня выучено</Text>
              <Text style={[styles.todayProgressCount, { color: colors.primary }]}>{todayLearned} / {wordsPerDay}</Text>
            </View>
            <View style={styles.todayProgressBar}>
              <View style={[styles.todayProgressFill, { width: `${Math.min((todayLearned / wordsPerDay) * 100, 100)}%`, backgroundColor: colors.primary }]} />
            </View>
          </View>
        )}

        {activeTab === 'review' && (
          <View style={styles.todayProgressContainer}>
            <View style={styles.todayProgressHeader}>
              <Text style={[styles.todayProgressLabel, { color: colors.textSecondary }]}>Сегодня повторено</Text>
              <Text style={[styles.todayProgressCount, { color: '#FF9800' }]}>{todayReviewed} / {reviewCount}</Text>
            </View>
            <View style={styles.todayProgressBar}>
              <View style={[styles.todayProgressFill, {
                width: reviewCount > 0 ? `${Math.min((todayReviewed / reviewCount) * 100, 100)}%` : '0%',
                backgroundColor: '#FF9800'
              }]} />
            </View>
          </View>
        )}

        <View style={styles.emptyContainer}>
          <Icon name="check-circle" size={80} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {activeTab === 'learn' ? 'Все слова выучены!' :
             !hasLearnedWords ? 'Нет выученных слов' :
             allReviewed ? '🎉 Все слова повторены!' :
             'Начните повторять слова'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {activeTab === 'learn' ? 'Отлично! Перейдите в "Повторять" чтобы закрепить.' :
             !hasLearnedWords ? 'Выучите слова, чтобы начать повторение.' :
             allReviewed ? 'Вы повторили все выученные слова. Учите новые!' :
             'Свайпайте вправо, чтобы повторить слова'}
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => switchTab(activeTab === 'learn' ? 'review' : 'learn')}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.emptyButtonGradient}>
              <Text style={styles.emptyButtonText}>
                {activeTab === 'learn' ? 'Перейти к повторению' : 'Учить новые слова'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {showCelebration && (
        <Animated.View
          style={[styles.celebrationOverlay, { opacity: celebrationOpacity, transform: [{ scale: celebrationScale }] }]}
          pointerEvents="none"
        >
          <ConfettiExplosion />
          <View style={styles.celebrationContent}>
            <Icon name="emoji-events" size={70} color="#FFD700" />
            <Text style={[styles.celebrationTitle, { color: colors.text }]}>{celebrationMessage}</Text>
          </View>
        </Animated.View>
      )}

      <View style={styles.tabContainer}>
        {['learn', 'review'].map(tab => {
          const count = tab === 'learn'
            ? allWords.filter(w => !w.isLearned).length
            : allWords.filter(w => w.isLearned && !reviewedWords.includes(w.id)).length;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => switchTab(tab)}
            >
              <Icon name={tab === 'learn' ? 'menu-book' : 'autorenew'} size={20} color={activeTab === tab ? '#fff' : colors.textSecondary} />
              <Text style={[styles.tabText, { color: activeTab === tab ? '#fff' : colors.textSecondary }]}>
                {tab === 'learn' ? 'Учить' : 'Повторять'}
              </Text>
              <View style={[styles.tabBadge, tab === 'review' && styles.tabBadgeReview]}>
                <Text style={styles.tabBadgeText}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'learn' && (
        <View style={styles.todayProgressContainer}>
          <View style={styles.todayProgressHeader}>
            <Text style={[styles.todayProgressLabel, { color: colors.textSecondary }]}>Сегодня выучено</Text>
            <Text style={[styles.todayProgressCount, { color: colors.primary }]}>{todayLearned} / {wordsPerDay}</Text>
          </View>
          <View style={styles.todayProgressBar}>
            <View style={[styles.todayProgressFill, { width: `${Math.min((todayLearned / wordsPerDay) * 100, 100)}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>
      )}

      {activeTab === 'review' && (
        <View style={styles.todayProgressContainer}>
          <View style={styles.todayProgressHeader}>
            <Text style={[styles.todayProgressLabel, { color: colors.textSecondary }]}>Сегодня повторено</Text>
            <Text style={[styles.todayProgressCount, { color: '#FF9800' }]}>{todayReviewed} / {reviewCount}</Text>
          </View>
          <View style={styles.todayProgressBar}>
            <View style={[styles.todayProgressFill, {
              width: reviewCount > 0 ? `${Math.min((todayReviewed / reviewCount) * 100, 100)}%` : '0%',
              backgroundColor: '#FF9800'
            }]} />
          </View>
        </View>
      )}

      <View style={styles.cardContainer} {...panResponder.panHandlers}>
        <Animated.View style={[styles.card, {
          transform: [
            { scale },
            { translateX: pan.x },
            { translateY: pan.y },
            { rotate: rotate.interpolate({ inputRange: [-0.2, 0, 0.2], outputRange: ['-10deg', '0deg', '10deg'] }) }
          ]
        }]}>
          <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.cardGradient}>
            <View style={styles.cardBadges}>
              <View style={[styles.levelBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={[styles.levelBadgeText, { color: '#aaa' }]}>{currentWord.level}</Text>
              </View>
              <View style={styles.rightBadges}>
                {activeTab === 'review' && (
                  <View style={[styles.reviewBadge, { backgroundColor: reviewedWords.includes(currentWord.id) ? '#4CAF50' : '#FF9800' }]}>
                    <Text style={styles.reviewBadgeText}>
                      {reviewedWords.includes(currentWord.id) ? 'Повторено' : 'Повторить'}
                    </Text>
                  </View>
                )}
                {activeTab === 'learn' && postponedIds.includes(currentWord.id) && (
                  <View style={[styles.reviewBadge, { backgroundColor: '#FFB300' }]}>
                    <Text style={styles.reviewBadgeText}>Повтор</Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={[styles.wordText, { color: '#fff' }]}>{currentWord.word}</Text>

            {currentWord.transcription && (
              <Text style={[styles.transcriptionText, { color: '#888' }]}>{currentWord.transcription}</Text>
            )}

            <TouchableOpacity style={styles.translationButton} onPress={toggleTranslation} activeOpacity={0.8}>
              <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']} style={styles.translationButtonGradient}>
                <Icon name="translate" size={20} color="#aaa" />
                <Text style={styles.translationButtonText}>
                  {showTranslation ? 'Скрыть перевод' : 'Показать перевод'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {showTranslation && (
              <>
                <Text style={[styles.translationText, { color: '#4CAF50' }]}>{currentWord.translation}</Text>
                {currentWord.partOfSpeech && (
                  <Text style={[styles.partOfSpeech, { color: '#999' }]}>{currentWord.partOfSpeech}</Text>
                )}
                {currentWord.example && (
                  <View style={styles.exampleContainer}>
                    <Text style={styles.exampleLabel}>Пример:</Text>
                    <Text style={styles.exampleText}>"{currentWord.example}"</Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.swipeHint}>
              <View style={styles.swipeHintLeft}>
                <LinearGradient
                  colors={activeTab === 'learn' ? ['rgba(255,179,0,0.3)', 'rgba(255,179,0,0.1)'] : ['rgba(158,158,158,0.3)', 'rgba(158,158,158,0.1)']}
                  style={styles.swipeHintBadge}
                >
                  <Icon name="arrow-back" size={14} color={activeTab === 'learn' ? '#FFB300' : '#999'} />
                  <Text style={[styles.swipeHintText, { color: activeTab === 'learn' ? '#FFB300' : '#999' }]}>
                    Отложить
                  </Text>
                </LinearGradient>
              </View>
              <View style={styles.swipeHintRight}>
                <LinearGradient
                  colors={['rgba(76,175,80,0.3)', 'rgba(76,175,80,0.1)']}
                  style={styles.swipeHintBadge}
                >
                  <Text style={[styles.swipeHintText, { color: '#4CAF50' }]}>
                    {activeTab === 'learn' ? 'Выучить' : 'Повторить'}
                  </Text>
                  <Icon name="arrow-forward" size={14} color="#4CAF50" />
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16 },

  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  tabButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', gap: 6,
  },
  tabButtonActive: { backgroundColor: '#4CAF50' },
  tabText: { fontSize: 14, fontWeight: '600' },
  tabBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center',
  },
  tabBadgeReview: { backgroundColor: '#FFB300' },
  tabBadgeText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },

  todayProgressContainer: { paddingHorizontal: 20, paddingVertical: 8 },
  todayProgressHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  todayProgressLabel: { fontSize: 13, fontWeight: '500' },
  todayProgressCount: { fontSize: 15, fontWeight: '600' },
  todayProgressBar: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3, overflow: 'hidden',
  },
  todayProgressFill: { height: '100%', borderRadius: 3 },

  cardContainer: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16,
  },
  card: { width: width - 32, height: height * 0.62, borderRadius: 24, overflow: 'hidden' },
  cardGradient: { flex: 1, padding: 30, justifyContent: 'center', alignItems: 'center' },
  cardBadges: {
    flexDirection: 'row', position: 'absolute',
    top: 16, left: 16, right: 16,
    justifyContent: 'space-between', alignItems: 'center',
  },
  rightBadges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelBadge: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  levelBadgeText: { fontSize: 12, fontWeight: '600', color: '#aaa' },
  reviewBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  reviewBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  wordText: { fontSize: 42, fontWeight: '700', marginBottom: 8, textAlign: 'center', color: '#fff' },
  transcriptionText: {
    fontSize: 18, marginBottom: 16, textAlign: 'center',
    color: '#888', fontStyle: 'italic',
  },
  translationButton: {
    borderRadius: 25, overflow: 'hidden', marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  translationButtonGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 10, gap: 8,
  },
  translationButtonText: { color: '#aaa', fontSize: 14, fontWeight: '500' },
  translationText: {
    fontSize: 28, marginBottom: 8, textAlign: 'center',
    fontWeight: '600', color: '#4CAF50',
  },
  partOfSpeech: { fontSize: 16, fontStyle: 'italic', marginBottom: 4, color: '#999' },
  exampleContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)', padding: 12,
    borderRadius: 12, marginVertical: 8, width: '100%',
  },
  exampleLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  exampleText: { fontSize: 16, color: '#fff', fontStyle: 'italic' },

  swipeHint: {
    flexDirection: 'row', justifyContent: 'space-between',
    width: '100%', position: 'absolute',
    bottom: 20, left: 20, right: 20,
  },
  swipeHintLeft: { flexDirection: 'row', alignItems: 'center' },
  swipeHintRight: { flexDirection: 'row', alignItems: 'center' },
  swipeHintBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6,
  },
  swipeHintText: { fontSize: 12, fontWeight: '600' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: {
    fontSize: 24, fontWeight: 'bold', marginTop: 20,
    textAlign: 'center', color: '#fff',
  },
  emptyText: {
    fontSize: 16, textAlign: 'center', marginTop: 8,
    marginBottom: 24, color: '#aaa',
  },
  emptyButton: { borderRadius: 16, overflow: 'hidden' },
  emptyButtonGradient: { paddingHorizontal: 32, paddingVertical: 14 },
  emptyButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  confettiContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 },
  confettiCircle: { position: 'absolute' },
  confettiDiamond: { position: 'absolute' },

  celebrationOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center',
    alignItems: 'center', zIndex: 1000,
  },
  celebrationContent: {
    alignItems: 'center', padding: 30,
    backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 24, minWidth: width * 0.8,
  },
  celebrationTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 16, textAlign: 'center', color: '#fff' },
});

export default LearnScreen;