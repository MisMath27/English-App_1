import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder,
  Dimensions, SafeAreaView, StatusBar, Easing, LogBox,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';

LogBox.ignoreAllLogs();
const { width, height } = Dimensions.get('window');
import WORDS_JSON from '../data/words_with_translation.json';

const VALID_WORDS = WORDS_JSON.filter(item =>
  item.translation && item.translation.trim() !== '' && item.translation !== 'Перевод отсутствует'
);

const DEFAULT_WORDS = VALID_WORDS.map(item => ({
  id: item.id, word: item.word, translation: item.translation,
  level: item.level || 'A1', partOfSpeech: item.partOfSpeech || '',
  example: item.example || '', transcription: item.transcription || '',
  reviewCount: 0, isLearned: false, lastReviewed: null,
}));

const CONFETTI_COLORS = ['#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB', '#0ABDE3', '#10AC84', '#EE5A24', '#5F27CD', '#FF6FB7', '#00D2D3', '#FF9FF3', '#54A0FF'];

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
        x: new Animated.Value(centerX), y: new Animated.Value(centerY),
        scale: new Animated.Value(0), rotate: new Animated.Value(0),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size, isCircle: Math.random() > 0.5,
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
      Animated.timing(fadeAnim, { toValue: 0, duration: 1000, useNativeDriver: true }).start(() => setIsVisible(false));
    }, 4000);

    return () => {
      clearTimeout(timer);
      particles.current.forEach(p => { p.x.stopAnimation(); p.y.stopAnimation(); p.rotate.stopAnimation(); p.scale.stopAnimation(); });
    };
  }, []);

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.confettiContainer, { opacity: fadeAnim }]} pointerEvents="none">
      {particles.current.map((p, i) => (
        <Animated.View key={i} style={[p.isCircle ? styles.confettiCircle : styles.confettiDiamond, {
          backgroundColor: p.color, width: p.size, height: p.size, borderRadius: p.isCircle ? p.size / 2 : 2,
          transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }, {
            rotate: p.rotate.interpolate({ inputRange: [0, 720], outputRange: p.isCircle ? ['0deg', '720deg'] : ['45deg', '765deg'] })
          }]
        }]} />
      ))}
    </Animated.View>
  );
};

const LearnScreen = ({ route, navigation }) => {
  const { colors, fontSizeMultiplier } = useTheme();
  const { t } = useTranslation();

  const [currentUid, setCurrentUid] = useState(null);
  const currentUidRef = useRef(null);

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
  const [isLearnProcessing, setIsLearnProcessing] = useState(false);

  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const isProcessing = useRef(false);
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged((user) => {
      const uid = user ? user.uid : null;

      if (currentUidRef.current !== uid) {
        setAllWords([]);
        setSessionWords([]);
        setReviewedWords([]);
        setPostponedIds([]);
        setTodayLearned(0);
        setTodayReviewed(0);

        currentUidRef.current = uid;
        setCurrentUid(uid);

        if (uid) {
          loadData(uid);
        } else {
          setLoading(false); // Если нет юзера, просто выключаем загрузку
        }
      }
    });
    return subscriber;
  }, []);

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
      setSessionWords(shuffleArray(learned).slice(0, reviewCount));
      setCurrentIndex(0); setAllShown(false);
      return;
    }
    const remaining = wordsPerDay - todayLearned;
    if (remaining <= 0) {
      setSessionWords([]);
      if (!celebrationShown && todayLearned >= wordsPerDay) {
        setCelebrationShown(true);
        if (currentUidRef.current) AsyncStorage.setItem(`@english_app:celebrationShown_${currentUidRef.current}`, 'true');
        showCelebrationAnimation(`🎉 ${wordsPerDay}`);
      }
      return;
    }
    const notLearned = allWords.filter(w => !w.isLearned);
    const postponed = notLearned.filter(w => postponedIds.includes(w.id));
    const others = notLearned.filter(w => !postponedIds.includes(w.id));
    const finalList = [...postponed, ...shuffleArray(others)];
    setSessionWords(finalList.slice(0, remaining));
    setCurrentIndex(0); setAllShown(false);
  }, [activeTab, allWords, wordsPerDay, reviewCount, todayLearned, postponedIds, celebrationShown, reviewedWords]);

  useEffect(() => {
    if (!loading && allWords.length > 0 && !isLearnProcessing) generateSession();
  }, [allWords, todayLearned, postponedIds, reviewedWords, reviewCount, loading, isLearnProcessing, generateSession]);

  const getCurrentWord = useCallback(() => {
    if (sessionWords.length === 0) return null;
    if (!allShown) return sessionWords[currentIndex] || sessionWords[0];
    return sessionWords[Math.floor(Math.random() * sessionWords.length)] || sessionWords[0];
  }, [sessionWords, currentIndex, allShown]);

    const loadData = async (uid) => {
      try {
        // ЖЕСТКАЯ ПРОВЕРКА: Если uid нет, вообще ничего не грузим!
        if (!uid) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setAllWords([]); // Очищаем память от старых слов

        const wordsKey = `@english_app:words_${uid}`;
        const rawWords = await AsyncStorage.getItem(wordsKey);

        let words;
        if (rawWords) {
          words = JSON.parse(rawWords);
          // Проверка: если вдруг подгрузились старые данные с 7780, а база 9894
          if (words.length !== 9894) {
             console.log('Обнаружены старые данные, сбрасываем на дефолт');
             words = DEFAULT_WORDS;
             await AsyncStorage.setItem(wordsKey, JSON.stringify(words));
          }
        } else {
          words = DEFAULT_WORDS;
          await AsyncStorage.setItem(wordsKey, JSON.stringify(words));
        }

        setAllWords(words);

        // ... (остальной код загрузки postponed, settings, dailyStats, reviewedWords, celebration остается как был,
        // но с ключами строго через `_${uid}`)

        const postponedKey = `@english_app:postponedIds_${uid}`;
        const rawPostponed = await AsyncStorage.getItem(postponedKey);
        setPostponedIds(rawPostponed ? JSON.parse(rawPostponed) : []);

        const settingsKey = `@english_app:userSettings_${uid}`;
        const rawSettings = await AsyncStorage.getItem(settingsKey);
        const settings = rawSettings ? JSON.parse(rawSettings) : {};
        setWordsPerDay(settings.wordsPerDay || 30);
        setReviewCount(settings.reviewCount || 15);

        const dailyKey = `@english_app:dailyStats_${uid}`;
        const rawDaily = await AsyncStorage.getItem(dailyKey);
        const daily = rawDaily ? JSON.parse(rawDaily) : {};
        setTodayLearned(daily.learned || 0);

        const reviewedKey = `@english_app:reviewedWords_${uid}`;
        const rawReviewed = await AsyncStorage.getItem(reviewedKey);
        const reviewed = rawReviewed ? JSON.parse(rawReviewed) : [];
        setReviewedWords(reviewed);
        setTodayReviewed(reviewed.length);

        const celebrationKey = `@english_app:celebrationShown_${uid}`;
        const rawCelebration = await AsyncStorage.getItem(celebrationKey);
        setCelebrationShown(rawCelebration === 'true');

      } catch (error) {
        console.log('Error loading:', error);
        setAllWords(DEFAULT_WORDS);
      } finally {
        setLoading(false);
      }
    };

  const currentWord = getCurrentWord();

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (e, gesture) => {
      pan.setValue({ x: gesture.dx, y: gesture.dy });
      scale.setValue(Math.max(0.8, 1 - Math.abs(gesture.dx) / (width * 2)));
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
          pan.setValue({ x: 0, y: 0 }); scale.setValue(1); rotate.setValue(0);
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
    const activeUid = currentUidRef.current;

    if (isLearnTab) {
      if (isLearning) {
        setIsLearnProcessing(true);
        const newAllWords = allWords.map(w => w.id === currentWord.id ? { ...w, isLearned: true, lastReviewed: new Date().toISOString() } : w);
        const newPostponedIds = postponedIds.filter(id => id !== currentWord.id);
        setAllWords(newAllWords); setPostponedIds(newPostponedIds);

        await AsyncStorage.setItem(`@english_app:words_${activeUid}`, JSON.stringify(newAllWords));
        await AsyncStorage.setItem(`@english_app:postponedIds_${activeUid}`, JSON.stringify(newPostponedIds));

        const dailyKey = `@english_app:dailyStats_${activeUid}`;
        const rawDaily = await AsyncStorage.getItem(dailyKey);
        const daily = rawDaily ? JSON.parse(rawDaily) : {};
        const newLearned = (daily.learned || 0) + 1;
        await AsyncStorage.setItem(dailyKey, JSON.stringify({ ...daily, learned: newLearned }));
        setTodayLearned(newLearned);

        const historyKey = `@english_app:dailyStatsHistory_${activeUid}`;
                const rawHistory = await AsyncStorage.getItem(historyKey);
                const history = rawHistory ? JSON.parse(rawHistory) : {};
                const todayString = new Date().toDateString();

                if (!history[todayString]) history[todayString] = { learned: 0, reviewed: 0 };
                history[todayString].learned += 1;

                await AsyncStorage.setItem(historyKey, JSON.stringify(history));

        if (newLearned >= wordsPerDay && !celebrationShown) {
          setCelebrationShown(true);
          await AsyncStorage.setItem(`@english_app:celebrationShown_${activeUid}`, 'true');
          showCelebrationAnimation(`${wordsPerDay}`);
        }
        const updatedSession = sessionWords.filter(w => w.id !== currentWord.id);
        setSessionWords(updatedSession); setCurrentIndex(0); setAllShown(false);
        setTimeout(() => {
          if (updatedSession.length === 0) generateSession();
          setIsLearnProcessing(false); isProcessing.current = false;
        }, 100);
      } else if (isPostponing) {
        const newPostponedIds = [...postponedIds];
        if (!newPostponedIds.includes(currentWord.id)) newPostponedIds.push(currentWord.id);
        setPostponedIds(newPostponedIds);
        await AsyncStorage.setItem(`@english_app:postponedIds_${activeUid}`, JSON.stringify(newPostponedIds));

        const updatedSession = sessionWords.filter(w => w.id !== currentWord.id);
        setSessionWords(updatedSession); setCurrentIndex(0); setAllShown(false);
        setTimeout(() => {
          if (updatedSession.length === 0) generateSession();
          isProcessing.current = false;
        }, 100);
      }
    } else {
      if (direction === 1) {
        if (!reviewedWords.includes(currentWord.id)) {
          const newReviewed = [...reviewedWords, currentWord.id];
          setReviewedWords(newReviewed);
          await AsyncStorage.setItem(`@english_app:reviewedWords_${activeUid}`, JSON.stringify(newReviewed));

          const dailyKey = `@english_app:dailyStats_${activeUid}`;
          const rawDaily = await AsyncStorage.getItem(dailyKey);
          const daily = rawDaily ? JSON.parse(rawDaily) : {};
          await AsyncStorage.setItem(dailyKey, JSON.stringify({ ...daily, reviewed: newReviewed.length }));
          setTodayReviewed(newReviewed.length);

          const historyKey = `@english_app:dailyStatsHistory_${activeUid}`;
                    const rawHistory = await AsyncStorage.getItem(historyKey);
                    const history = rawHistory ? JSON.parse(rawHistory) : {};
                    const todayString = new Date().toDateString();

                    if (!history[todayString]) history[todayString] = { learned: 0, reviewed: 0 };
                    history[todayString].reviewed += 1;

                    await AsyncStorage.setItem(historyKey, JSON.stringify(history));

        }
        const updatedSession = sessionWords.filter(w => w.id !== currentWord.id);
        setSessionWords(updatedSession); setCurrentIndex(0); setAllShown(false);
        setTimeout(() => {
          if (updatedSession.length === 0) generateSession();
          isProcessing.current = false;
        }, 100);
      } else isProcessing.current = false;
    }
  };

  const toggleTranslation = () => setShowTranslation(!showTranslation);

  const switchTab = (tab) => {
    setActiveTab(tab); setCurrentIndex(0); setShowTranslation(false);
    setShowCelebration(false); setAllShown(false);
    pan.setValue({ x: 0, y: 0 }); scale.setValue(1); rotate.setValue(0);
    setTimeout(() => generateSession(), 100);
  };

  const totalLearnedWords = allWords.filter(w => w.isLearned).length;
  const hasLearnedWords = totalLearnedWords > 0;
  const allReviewed = hasLearnedWords && allWords.filter(w => w.isLearned).every(w => reviewedWords.includes(w.id));

  // Если пользователь не авторизован, показываем экран входа
  if (!currentUid && !loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
         <Icon name="lock" size={80} color={colors.primary} />
         <Text style={{color: colors.text, fontSize: 22, marginTop: 20, fontWeight: 'bold'}}>Требуется вход</Text>
         <Text style={{color: colors.textSecondary, fontSize: 16, marginTop: 10, textAlign: 'center', paddingHorizontal: 40}}>
            Для сохранения прогресса и доступа к словарю, пожалуйста, войдите в аккаунт в настройках.
         </Text>
         <TouchableOpacity
           style={{ marginTop: 30, backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 }}
           onPress={() => navigation.navigate(t('tab_settings'))}
         >
           <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>Перейти в настройки</Text>
         </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Icon name="menu-book" size={60} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: 16 * fontSizeMultiplier }]}>{t('learn_loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {['learn', 'review'].map(tab => {
        const count = tab === 'learn' ? allWords.filter(w => !w.isLearned).length : allWords.filter(w => w.isLearned && !reviewedWords.includes(w.id)).length;
        return (
          <TouchableOpacity key={tab} style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]} onPress={() => switchTab(tab)}>
            <Icon name={tab === 'learn' ? 'menu-book' : 'autorenew'} size={20} color={activeTab === tab ? '#fff' : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === tab ? '#fff' : colors.textSecondary, fontSize: 14 * fontSizeMultiplier }]}>
              {tab === 'learn' ? t('learn_tab_learn') : t('learn_tab_review')}
            </Text>
            <View style={[styles.tabBadge, tab === 'review' && styles.tabBadgeReview]}>
              <Text style={[styles.tabBadgeText, { fontSize: 10 * fontSizeMultiplier }]}>{count}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderProgress = () => (
    <View style={styles.todayProgressContainer}>
      <View style={styles.todayProgressHeader}>
        <Text style={[styles.todayProgressLabel, { color: colors.textSecondary, fontSize: 13 * fontSizeMultiplier }]}>
          {activeTab === 'learn' ? t('learn_today_learned') : t('learn_today_reviewed')}
        </Text>
        <Text style={[styles.todayProgressCount, { color: activeTab === 'learn' ? colors.primary : '#FF9800', fontSize: 15 * fontSizeMultiplier }]}>
          {activeTab === 'learn' ? `${todayLearned} / ${wordsPerDay}` : `${todayReviewed} / ${reviewCount}`}
        </Text>
      </View>
      <View style={styles.todayProgressBar}>
        <View style={[styles.todayProgressFill, {
          width: activeTab === 'learn'
            ? `${Math.min((todayLearned / wordsPerDay) * 100, 100)}%`
            : reviewCount > 0 ? `${Math.min((todayReviewed / reviewCount) * 100, 100)}%` : '0%',
          backgroundColor: activeTab === 'learn' ? colors.primary : '#FF9800',
        }]} />
      </View>
    </View>
  );

  if (!currentWord) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        {showCelebration && (
          <Animated.View style={[styles.celebrationOverlay, { opacity: celebrationOpacity, transform: [{ scale: celebrationScale }] }]} pointerEvents="none">
            <ConfettiExplosion />
            <View style={styles.celebrationContent}>
              <Icon name="emoji-events" size={70} color="#FFD700" />
              <Text style={[styles.celebrationTitle, { color: colors.text, fontSize: 24 * fontSizeMultiplier }]}>{celebrationMessage}</Text>
            </View>
          </Animated.View>
        )}
        {renderTabs()}
        {renderProgress()}
        <View style={styles.emptyContainer}>
          <Icon name="check-circle" size={80} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text, fontSize: 24 * fontSizeMultiplier }]}>
            {activeTab === 'learn' ? t('learn_all_learned') : !hasLearnedWords ? t('learn_no_learned') : allReviewed ? t('learn_all_reviewed') : t('learn_start_review')}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 16 * fontSizeMultiplier }]}>
            {activeTab === 'learn' ? t('learn_all_learned_desc') : !hasLearnedWords ? t('learn_no_learned_desc') : allReviewed ? t('learn_all_reviewed_desc') : t('learn_start_review_desc')}
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => switchTab(activeTab === 'learn' ? 'review' : 'learn')}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.emptyButtonGradient}>
              <Text style={[styles.emptyButtonText, { fontSize: 16 * fontSizeMultiplier }]}>
                {activeTab === 'learn' ? t('learn_go_review') : t('learn_go_learn')}
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
        <Animated.View style={[styles.celebrationOverlay, { opacity: celebrationOpacity, transform: [{ scale: celebrationScale }] }]} pointerEvents="none">
          <ConfettiExplosion />
          <View style={styles.celebrationContent}>
            <Icon name="emoji-events" size={70} color="#FFD700" />
            <Text style={[styles.celebrationTitle, { color: colors.text, fontSize: 24 * fontSizeMultiplier }]}>{celebrationMessage}</Text>
          </View>
        </Animated.View>
      )}
      {renderTabs()}
      {renderProgress()}

      <View style={styles.cardContainer} {...panResponder.panHandlers}>
        <Animated.View style={[styles.card, {
          transform: [
            { scale }, { translateX: pan.x }, { translateY: pan.y },
            { rotate: rotate.interpolate({ inputRange: [-0.2, 0, 0.2], outputRange: ['-10deg', '0deg', '10deg'] }) }
          ]
        }]}>
          <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.cardGradient}>
            <View style={styles.cardBadges}>
              <View style={[styles.levelBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={[styles.levelBadgeText, { fontSize: 12 * fontSizeMultiplier }]}>{currentWord.level}</Text>
              </View>
              <View style={styles.rightBadges}>
                {activeTab === 'review' && (
                  <View style={[styles.reviewBadge, { backgroundColor: reviewedWords.includes(currentWord.id) ? '#4CAF50' : '#FF9800' }]}>
                    <Text style={[styles.reviewBadgeText, { fontSize: 12 * fontSizeMultiplier }]}>
                      {reviewedWords.includes(currentWord.id) ? t('learn_reviewed') : t('learn_review')}
                    </Text>
                  </View>
                )}
                {activeTab === 'learn' && postponedIds.includes(currentWord.id) && (
                  <View style={[styles.reviewBadge, { backgroundColor: '#FFB300' }]}>
                    <Text style={[styles.reviewBadgeText, { fontSize: 12 * fontSizeMultiplier }]}>{t('learn_repeat_short')}</Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={[styles.wordText, { fontSize: 42 * fontSizeMultiplier }]}>{currentWord.word}</Text>

            {currentWord.transcription && (
              <Text style={[styles.transcriptionText, { fontSize: 18 * fontSizeMultiplier }]}>{currentWord.transcription}</Text>
            )}

            <TouchableOpacity style={styles.translationButton} onPress={toggleTranslation} activeOpacity={0.8}>
              <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']} style={styles.translationButtonGradient}>
                <Icon name="translate" size={20} color="#aaa" />
                <Text style={[styles.translationButtonText, { fontSize: 14 * fontSizeMultiplier }]}>
                  {showTranslation ? t('learn_hide_translation') : t('learn_show_translation')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {showTranslation && (
              <>
                <Text style={[styles.translationText, { fontSize: 28 * fontSizeMultiplier }]}>{currentWord.translation}</Text>
                {currentWord.partOfSpeech && <Text style={[styles.partOfSpeech, { fontSize: 16 * fontSizeMultiplier }]}>{currentWord.partOfSpeech}</Text>}
                {currentWord.example && (
                  <View style={styles.exampleContainer}>
                    <Text style={[styles.exampleLabel, { fontSize: 12 * fontSizeMultiplier }]}>{t('learn_example')}</Text>
                    <Text style={[styles.exampleText, { fontSize: 16 * fontSizeMultiplier }]}>"{currentWord.example}"</Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.swipeHint}>
              <View style={styles.swipeHintLeft}>
                <LinearGradient colors={activeTab === 'learn' ? ['rgba(255,179,0,0.3)', 'rgba(255,179,0,0.1)'] : ['rgba(158,158,158,0.3)', 'rgba(158,158,158,0.1)']} style={styles.swipeHintBadge}>
                  <Icon name="arrow-back" size={14} color={activeTab === 'learn' ? '#FFB300' : '#999'} />
                  <Text style={[styles.swipeHintText, { color: activeTab === 'learn' ? '#FFB300' : '#999', fontSize: 12 * fontSizeMultiplier }]}>{t('learn_postpone')}</Text>
                </LinearGradient>
              </View>
              <View style={styles.swipeHintRight}>
                <LinearGradient colors={['rgba(76,175,80,0.3)', 'rgba(76,175,80,0.1)']} style={styles.swipeHintBadge}>
                  <Text style={[styles.swipeHintText, { color: '#4CAF50', fontSize: 12 * fontSizeMultiplier }]}>
                    {activeTab === 'learn' ? t('learn_learn') : t('learn_review')}
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
  loadingText: { marginTop: 16 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', gap: 6 },
  tabButtonActive: { backgroundColor: '#4CAF50' },
  tabText: { fontWeight: '600' },
  tabBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  tabBadgeReview: { backgroundColor: '#FFB300' },
  tabBadgeText: { color: '#fff', fontWeight: 'bold' },
  todayProgressContainer: { paddingHorizontal: 20, paddingVertical: 8 },
  todayProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  todayProgressLabel: { fontWeight: '500' },
  todayProgressCount: { fontWeight: '600' },
  todayProgressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  todayProgressFill: { height: '100%', borderRadius: 3 },
  cardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  card: { width: width - 32, height: height * 0.62, borderRadius: 24, overflow: 'hidden' },
  cardGradient: { flex: 1, padding: 30, justifyContent: 'center', alignItems: 'center' },
  cardBadges: { flexDirection: 'row', position: 'absolute', top: 16, left: 16, right: 16, justifyContent: 'space-between', alignItems: 'center' },
  rightBadges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
  levelBadgeText: { fontWeight: '600', color: '#aaa' },
  reviewBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  reviewBadgeText: { fontWeight: '600', color: '#fff' },
  wordText: { fontWeight: '700', marginBottom: 8, textAlign: 'center', color: '#fff' },
  transcriptionText: { marginBottom: 16, textAlign: 'center', color: '#888', fontStyle: 'italic' },
  translationButton: { borderRadius: 25, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  translationButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 8 },
  translationButtonText: { color: '#aaa', fontWeight: '500' },
  translationText: { marginBottom: 8, textAlign: 'center', fontWeight: '600', color: '#4CAF50' },
  partOfSpeech: { fontStyle: 'italic', marginBottom: 4, color: '#999' },
  exampleContainer: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 12, marginVertical: 8, width: '100%' },
  exampleLabel: { color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  exampleText: { color: '#fff', fontStyle: 'italic' },
  swipeHint: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', position: 'absolute', bottom: 20, left: 20, right: 20 },
  swipeHintLeft: { flexDirection: 'row', alignItems: 'center' },
  swipeHintRight: { flexDirection: 'row', alignItems: 'center' },
  swipeHintBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  swipeHintText: { fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontWeight: 'bold', marginTop: 20, textAlign: 'center', color: '#fff' },
  emptyText: { textAlign: 'center', marginTop: 8, marginBottom: 24, color: '#aaa' },
  emptyButton: { borderRadius: 16, overflow: 'hidden' },
  emptyButtonGradient: { paddingHorizontal: 32, paddingVertical: 14 },
  emptyButtonText: { color: '#fff', fontWeight: '600' },
  confettiContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 },
  confettiCircle: { position: 'absolute' },
  confettiDiamond: { position: 'absolute' },
  celebrationOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  celebrationContent: { alignItems: 'center', padding: 30, backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 24, minWidth: width * 0.8 },
  celebrationTitle: { fontWeight: 'bold', marginTop: 16, textAlign: 'center', color: '#fff' },
});

export default LearnScreen;