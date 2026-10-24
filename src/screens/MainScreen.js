import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Animated, Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const QUOTES_DATABASE = [
  { id: 1, text: "The limits of my language mean the limits of my world.", author: "Ludwig Wittgenstein" },
  { id: 2, text: "Language is the road map of a culture.", author: "Rita Mae Brown" },
  { id: 3, text: "To learn a language is to have one more window from which to look at the world.", author: "Chinese proverb" },
  { id: 4, text: "Knowledge is power.", author: "Francis Bacon" },
  { id: 5, text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
  { id: 6, text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { id: 7, text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { id: 8, text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { id: 9, text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { id: 10, text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
];

const MainScreen = ({ navigation }) => {
  const { colors, fontSizeMultiplier } = useTheme();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [vocabularySize, setVocabularySize] = useState({ total: 0, learned: 0, inProgress: 0, toReview: 0 });
  const [quote, setQuote] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [userName, setUserName] = useState('');
  const [userData, setUserData] = useState({ streakDays: 0, accuracy: 0, weeklyProgress: 0 });

  const [currentUid, setCurrentUid] = useState(null);
  const currentUidRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      const unsubscribeAuth = auth().onAuthStateChanged((user) => {
        const uid = user ? user.uid : null;

        if (currentUidRef.current !== uid) {
          setVocabularySize({ total: 0, learned: 0, inProgress: 0, toReview: 0 });
          setChartData(null); // Сбрасываем график перед загрузкой
          currentUidRef.current = uid;
          setCurrentUid(uid);

          if (uid) {
             loadUserData(uid);
             getDailyQuote(uid);
          } else {
             setLoading(false);
          }
        }
      });
      return () => unsubscribeAuth();
    }, [])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const getDailyQuote = async (uid) => {
    try {
      const today = new Date().toDateString();
      const quoteKey = `@english_app:quoteDate_${uid}`;
      const dailyQuoteKey = `@english_app:dailyQuote_${uid}`;
      const usedIdsKey = `@english_app:usedQuoteIds_${uid}`;

      const storedDate = await AsyncStorage.getItem(quoteKey);
      const storedQuote = await AsyncStorage.getItem(dailyQuoteKey);

      if (storedDate === today && storedQuote) {
        setQuote(JSON.parse(storedQuote));
        return;
      }

      const usedIdsJson = await AsyncStorage.getItem(usedIdsKey);
      let usedIds = usedIdsJson ? JSON.parse(usedIdsJson) : [];
      if (usedIds.length >= QUOTES_DATABASE.length) usedIds = [];
      const availableQuotes = QUOTES_DATABASE.filter(q => !usedIds.includes(q.id));
      let randomQuote;

      if (availableQuotes.length > 0) {
        randomQuote = availableQuotes[Math.floor(Math.random() * availableQuotes.length)];
      } else {
        randomQuote = QUOTES_DATABASE[Math.floor(Math.random() * QUOTES_DATABASE.length)];
        usedIds = [];
      }
      const newUsedIds = [...usedIds, randomQuote.id];

      await AsyncStorage.setItem(quoteKey, today);
      await AsyncStorage.setItem(dailyQuoteKey, JSON.stringify(randomQuote));
      await AsyncStorage.setItem(usedIdsKey, JSON.stringify(newUsedIds));
      setQuote(randomQuote);
    } catch (error) {
      console.log('Error loading quote:', error);
      setQuote(QUOTES_DATABASE[0]);
    }
  };

  const loadUserData = async (uid) => {
    try {
      if (!uid) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const userNameKey = `@english_app:userName_${uid}`;
      const savedName = await AsyncStorage.getItem(userNameKey);
      if (savedName) setUserName(savedName);
      else if (auth().currentUser) setUserName(auth().currentUser.displayName || '');

      const wordsKey = `@english_app:words_${uid}`;
      const rawWords = await AsyncStorage.getItem(wordsKey);

      let words = [];
      if (rawWords) {
        words = JSON.parse(rawWords);
        // Проверка на старые данные (если массив не совпадает с размером базы)
        if (words.length !== 7880 && words.length !== 9894) {
            const WORDS_JSON = require('../data/words_with_translation.json');
            words = WORDS_JSON.filter(item => item.translation && item.translation.trim() !== '').map(item => ({
              ...item, isLearned: false
            }));
            await AsyncStorage.setItem(wordsKey, JSON.stringify(words));
        }
      } else {
        const WORDS_JSON = require('../data/words_with_translation.json');
        words = WORDS_JSON.filter(item => item.translation && item.translation.trim() !== '').map(item => ({
          ...item, isLearned: false
        }));
        await AsyncStorage.setItem(wordsKey, JSON.stringify(words));
      }

      const total = words.length;
      const learned = words.filter(w => w.isLearned).length;
      const inProgress = words.filter(w => w.reviewCount > 0 && !w.isLearned).length;

      setVocabularySize({ total, learned, inProgress, toReview: learned });

      const statsKey = `@english_app:userStats_${uid}`;
      const rawStats = await AsyncStorage.getItem(statsKey);
      const stats = rawStats ? JSON.parse(rawStats) : {};
      setUserData({
        streakDays: stats.streakDays || 0,
        accuracy: stats.accuracy || 0,
        weeklyProgress: stats.weeklyProgress || 0,
      });

      await generateRealChartData(selectedPeriod, uid);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRealChartData = async (period, uid) => {
    try {
      const historyKey = `@english_app:dailyStatsHistory_${uid}`;
      const rawHistory = await AsyncStorage.getItem(historyKey);
      const history = rawHistory ? JSON.parse(rawHistory) : {};

      const today = new Date();
      let labels = [];
      let learnedData = [];
      let reviewedData = [];

      if (period === 'week') {
        const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = d.toDateString();
          labels.push(dayNames[d.getDay()]);
          learnedData.push(history[key]?.learned || 0);
          reviewedData.push(history[key]?.reviewed || 0);
        }
      } else if (period === 'month') {
        for (let w = 3; w >= 0; w--) {
          let totalLearned = 0;
          let totalReviewed = 0;
          for (let d = 0; d < 7; d++) {
            const date = new Date(today);
            date.setDate(date.getDate() - (w * 7 + d));
            const key = date.toDateString();
            totalLearned += history[key]?.learned || 0;
            totalReviewed += history[key]?.reviewed || 0;
          }
          labels.push(`${4 - w} нед`);
          learnedData.push(totalLearned);
          reviewedData.push(totalReviewed);
        }
      } else {
        const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        for (let m = 5; m >= 0; m--) {
          const d = new Date(today.getFullYear(), today.getMonth() - m, 1);
          let totalLearned = 0;
          let totalReviewed = 0;
          const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
          for (let day = 1; day <= daysInMonth; day++) {
            const key = new Date(d.getFullYear(), d.getMonth(), day).toDateString();
            totalLearned += history[key]?.learned || 0;
            totalReviewed += history[key]?.reviewed || 0;
          }
          labels.push(monthNames[d.getMonth()]);
          learnedData.push(totalLearned);
          reviewedData.push(totalReviewed);
        }
      }

      // Проверяем, есть ли вообще данные для отрисовки
      const hasData = learnedData.some(v => v > 0) || reviewedData.some(v => v > 0);

      if (!hasData) {
        setChartData({ labels, datasets: [], isEmpty: true });
        return;
      }

      setChartData({
        labels,
        datasets: [
          { data: learnedData, color: (o = 1) => `rgba(76, 175, 80, ${o})` },
          { data: reviewedData, color: (o = 1) => `rgba(33, 150, 243, ${o})` },
        ],
        isEmpty: false,
      });
    } catch (error) {
      console.log('Error generating chart:', error);
      setChartData(null);
    }
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    Animated.sequence([
      Animated.timing(progressAnim, { toValue: 0.5, duration: 150, useNativeDriver: false }),
      Animated.timing(progressAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();
    generateRealChartData(period, currentUidRef.current);
  };

  const getVocabularyLevel = (count) => {
    if (count >= 2000) return { label: t('settings_status_advanced'), color: '#9C27B0' };
    if (count >= 1000) return { label: t('settings_status_intermediate'), color: '#2196F3' };
    if (count >= 500) return { label: t('settings_status_elementary'), color: '#4CAF50' };
    return { label: t('settings_status_beginner'), color: '#FF9800' };
  };

  const level = getVocabularyLevel(vocabularySize.learned);

  if (!currentUid && !loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
         <Icon name="lock" size={80} color={colors.primary} />
         <Text style={{color: colors.text, fontSize: 22, marginTop: 20, fontWeight: 'bold'}}>Добро пожаловать!</Text>
         <Text style={{color: colors.textSecondary, fontSize: 16, marginTop: 10, textAlign: 'center', paddingHorizontal: 40}}>
            Войдите в аккаунт, чтобы сохранять прогресс и видеть статистику.
         </Text>
         <TouchableOpacity
           style={{ marginTop: 30, backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 }}
           onPress={() => navigation.navigate(t('tab_settings'))}
         >
           <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>Войти</Text>
         </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
          <Icon name="school" size={60} color={colors.primary} />
        </Animated.View>
        <Animated.Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: 16 * fontSizeMultiplier }]}>
          {t('loading')}
        </Animated.Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.quoteContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.quoteGradient}>
          <Icon name="format-quote" size={24} color="rgba(255,255,255,0.3)" style={styles.quoteIcon} />
          <Text style={[styles.quoteText, { fontSize: 16 * fontSizeMultiplier }]}>"{quote?.text}"</Text>
          <Text style={[styles.quoteAuthor, { fontSize: 14 * fontSizeMultiplier }]}>— {quote?.author}</Text>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={[styles.welcomeUser, { color: colors.text, fontSize: 24 * fontSizeMultiplier }]}>
          {t('home_greeting')}, {userName || t('home_friend')}!
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontSize: 14 * fontSizeMultiplier }]}>
          {vocabularySize.total > 0
            ? `${t('home_learned_words')} ${vocabularySize.learned} ${t('home_words')}`
            : t('home_start_learning')}
        </Text>
      </Animated.View>

      {vocabularySize.total > 0 && (
        <>
          <GlassCard style={styles.vocabCard}>
            <View style={styles.vocabHeader}>
              <Text style={[styles.vocabTitle, { color: colors.text, fontSize: 18 * fontSizeMultiplier }]}>{t('home_vocab')}</Text>
              <View style={[styles.levelBadge, { backgroundColor: level.color + '20' }]}>
                <Text style={[styles.levelText, { color: level.color, fontSize: 12 * fontSizeMultiplier }]}>{level.label}</Text>
              </View>
            </View>
            <View style={styles.vocabMainStat}>
              <Text style={[styles.vocabMainNumber, { color: colors.primary }]}>{vocabularySize.learned}</Text>
              <Text style={[styles.vocabMainLabel, { color: colors.text, fontSize: 14 * fontSizeMultiplier }]}>{t('home_learned')}</Text>
            </View>
            <View style={styles.vocabSecondaryStats}>
              <View style={styles.vocabStatItem}>
                <Text style={[styles.vocabStatNumber, { color: colors.text, fontSize: 20 * fontSizeMultiplier }]}>{vocabularySize.total}</Text>
                <Text style={[styles.vocabStatLabel, { color: colors.textSecondary, fontSize: 11 * fontSizeMultiplier }]}>{t('home_total')}</Text>
              </View>
              <View style={[styles.vocabStatDivider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.vocabStatItem}>
                <Text style={[styles.vocabStatNumber, { color: colors.text, fontSize: 20 * fontSizeMultiplier }]}>{vocabularySize.inProgress}</Text>
                <Text style={[styles.vocabStatLabel, { color: colors.textSecondary, fontSize: 11 * fontSizeMultiplier }]}>{t('home_in_progress')}</Text>
              </View>
              <View style={[styles.vocabStatDivider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.vocabStatItem}>
                <Text style={[styles.vocabStatNumber, { color: colors.text, fontSize: 20 * fontSizeMultiplier }]}>{vocabularySize.toReview}</Text>
                <Text style={[styles.vocabStatLabel, { color: colors.textSecondary, fontSize: 11 * fontSizeMultiplier }]}>{t('home_to_review')}</Text>
              </View>
            </View>
          </GlassCard>

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate(t('tab_learn'))} activeOpacity={0.8}>
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.actionGradient}>
                <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
                  <Icon name="menu-book" size={28} color="#fff" />
                </Animated.View>
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionText, { fontSize: 14 * fontSizeMultiplier }]}>{t('home_learn_words')}</Text>
                  <Text style={[styles.actionSubtext, { fontSize: 11 * fontSizeMultiplier }]}>
                    {vocabularySize.inProgress > 0
                      ? `${t('home_learned_words')} ${vocabularySize.total - vocabularySize.learned}`
                      : t('home_start')}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.reviewButton]} onPress={() => navigation.navigate(t('tab_learn'), { tab: 'review' })} activeOpacity={0.8}>
              <LinearGradient colors={[colors.secondary, '#0D6EFD']} style={styles.actionGradient}>
                <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
                  <Icon name="autorenew" size={28} color="#fff" />
                </Animated.View>
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionText, { fontSize: 14 * fontSizeMultiplier }]}>{t('home_review')}</Text>
                  <Text style={[styles.actionSubtext, { fontSize: 11 * fontSizeMultiplier }]}>
                    {vocabularySize.toReview > 0
                      ? `${vocabularySize.toReview} ${t('home_to_review')}`
                      : t('learn_all_learned')}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <GlassCard style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: colors.text, fontSize: 16 * fontSizeMultiplier }]}>
                {t('home_dynamics')}
              </Text>
              <View style={styles.periodSelector}>
                {['week', 'month', 'year'].map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodButton, selectedPeriod === p && styles.activePeriod]}
                    onPress={() => handlePeriodChange(p)}
                  >
                    <Text style={[styles.periodText, selectedPeriod === p && styles.activePeriodText, { fontSize: 12 * fontSizeMultiplier }]}>
                      {p === 'week' ? t('home_week') : p === 'month' ? t('home_month') : t('home_year')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

                        {chartData && chartData.isEmpty ? (
                          <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
                             <Icon name="insert-chart-outlined" size={40} color={colors.textMuted} />
                             <Text style={{ color: colors.textSecondary, marginTop: 10, fontSize: 14 }}>
                               Нет данных за выбранный период
                             </Text>
                          </View>
                        ) : chartData && chartData.datasets && chartData.datasets.length > 0 ? (
                          <Animated.View style={{ transform: [{ scale: progressAnim }] }}>
                            <BarChart
                              data={{
                                labels: chartData.labels,
                                datasets: [
                                  {
                                    data: chartData.datasets[0].data, // Выучено
                                    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})` // Зеленый
                                  },
                                  {
                                    data: chartData.datasets[1].data, // Повторено
                                    color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})` // Оранжевый
                                  },
                                ]
                              }}
                              width={width - 64}
                              height={220}
                              chartConfig={{
                                backgroundColor: colors.backgroundSecondary,
                                backgroundGradientFrom: colors.backgroundSecondary,
                                backgroundGradientTo: colors.backgroundSecondary,
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.6})`,
                                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.6})`,
                                style: { borderRadius: 16 },
                                barPercentage: 0.6,
                              }}
                              style={styles.chart}
                              showValuesOnTopOfBars
                              fromZero
                              withInnerLines={true}
                              // ВОТ ЭТА СТРОКА ДЕЛАЕТ ИХ СТЕКОВЫМИ (друг на друге)
                              // Если хотите, чтобы они стояли рядом (группированно), удалите эту строку
                              stacked={false}
                            />
                          </Animated.View>
                        ) : (
                          <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
                             <Text style={{ color: colors.textSecondary }}>Загрузка графика...</Text>
                          </View>
                        )}

                        <View style={styles.chartLegend}>
                          <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                            <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: 11 * fontSizeMultiplier }]}>{t('home_learned_chart')}</Text>
                          </View>
                          <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                            <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: 11 * fontSizeMultiplier }]}>{t('home_reviewed_chart')}</Text>
                          </View>
                        </View>
          </GlassCard>

          <GlassCard style={styles.statsCard}>
            <View style={styles.additionalStats}>
              <View style={styles.additionalStat}>
                <Icon name="whatshot" size={20} color="#FF9800" />
                <Text style={[styles.additionalStatValue, { color: colors.text, fontSize: 18 * fontSizeMultiplier }]}>{userData.streakDays || 0}</Text>
                <Text style={[styles.additionalStatLabel, { color: colors.textSecondary, fontSize: 11 * fontSizeMultiplier }]}>{t('home_streak')}</Text>
              </View>
              <View style={[styles.additionalStatDivider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.additionalStat}>
                <Icon name="check-circle" size={20} color={colors.primary} />
                <Text style={[styles.additionalStatValue, { color: colors.text, fontSize: 18 * fontSizeMultiplier }]}>{userData.accuracy || 0}%</Text>
                <Text style={[styles.additionalStatLabel, { color: colors.textSecondary, fontSize: 11 * fontSizeMultiplier }]}>{t('home_progress')}</Text>
              </View>
              <View style={[styles.additionalStatDivider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.additionalStat}>
                <Icon name="flag" size={20} color={colors.secondary} />
                <Text style={[styles.additionalStatValue, { color: colors.text, fontSize: 18 * fontSizeMultiplier }]}>{userData.weeklyProgress || 0}%</Text>
                <Text style={[styles.additionalStatLabel, { color: colors.textSecondary, fontSize: 11 * fontSizeMultiplier }]}>{t('home_week_goal')}</Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard style={styles.levelProgressCard}>
            <View style={styles.levelProgressHeader}>
              <Text style={[styles.levelProgressLabel, { color: colors.textSecondary, fontSize: 13 * fontSizeMultiplier }]}>
                {t('home_next_level')}
              </Text>
              <Text style={[styles.levelProgressPercent, { color: colors.primary, fontSize: 13 * fontSizeMultiplier }]}>
                {vocabularySize.total > 0
                  ? Math.min(Math.round((vocabularySize.learned / vocabularySize.total) * 100), 100)
                  : 0}%
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${
                      vocabularySize.total > 0
                        ? Math.min((vocabularySize.learned / vocabularySize.total) * 100, 100)
                        : 0
                    }%`,
                    backgroundColor: level.color,
                  },
                ]}
              />
            </View>
            <Text style={[styles.nextLevelText, { color: colors.textSecondary, fontSize: 12 * fontSizeMultiplier }]}>
              {vocabularySize.learned >= 200
                ? t('settings_status_advanced')
                : `${t('home_to_next_level')} ${
                    vocabularySize.learned >= 100
                      ? 200 - vocabularySize.learned
                      : vocabularySize.learned >= 50
                      ? 100 - vocabularySize.learned
                      : 50 - vocabularySize.learned
                  } ${t('home_words_short')}`}
            </Text>
          </GlassCard>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16 },
  quoteContainer: { margin: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  quoteGradient: { padding: 20, position: 'relative' },
  quoteIcon: { position: 'absolute', top: 10, right: 15 },
  quoteText: { color: '#fff', fontStyle: 'italic', lineHeight: 24, marginBottom: 8 },
  quoteAuthor: { color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
  header: { padding: 24, paddingTop: 0 },
  welcomeUser: { fontWeight: 'bold' },
  headerSubtitle: { marginTop: 4 },
  welcomeContainer: { alignItems: 'center', padding: 40 },
  welcomeTitle: { fontWeight: 'bold', marginTop: 16 },
  welcomeText: { textAlign: 'center', marginTop: 8, marginBottom: 24 },
  welcomeButton: { borderRadius: 16, overflow: 'hidden' },
  welcomeButtonGradient: { paddingHorizontal: 32, paddingVertical: 14 },
  welcomeButtonText: { color: '#fff', fontWeight: '600' },
  vocabCard: { margin: 16, marginTop: 0, padding: 20 },
  vocabHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  vocabTitle: { fontWeight: '600' },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  levelText: { fontWeight: '600' },
  vocabMainStat: { alignItems: 'center', marginBottom: 16 },
  vocabMainNumber: { fontSize: 48, fontWeight: 'bold' },
  vocabMainLabel: { marginTop: 4 },
  vocabSecondaryStats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  vocabStatItem: { alignItems: 'center', flex: 1 },
  vocabStatNumber: { fontWeight: '600' },
  vocabStatLabel: { marginTop: 2 },
  vocabStatDivider: { width: 1, height: 30 },
  actionsContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 },
  actionButton: { flex: 1, marginHorizontal: 4, borderRadius: 16, overflow: 'hidden' },
  reviewButton: { marginLeft: 8 },
  actionGradient: { padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  actionTextContainer: { marginLeft: 12 },
  actionText: { color: '#fff', fontWeight: '600' },
  actionSubtext: { color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  chartContainer: { margin: 16, marginTop: 0, padding: 16 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartTitle: { fontWeight: '600' },
  periodSelector: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 2 },
  periodButton: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 18 },
  activePeriod: { backgroundColor: '#4CAF50' },
  periodText: { color: '#B0B0C0' },
  activePeriodText: { color: '#fff', fontWeight: '500' },
  chart: { borderRadius: 16, marginVertical: 8 },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginVertical: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  legendText: {},
  statsCard: { margin: 16, marginTop: 0, padding: 16 },
  additionalStats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  additionalStat: { alignItems: 'center', flex: 1 },
  additionalStatValue: { fontWeight: '600', marginTop: 4 },
  additionalStatLabel: { marginTop: 2 },
  additionalStatDivider: { width: 1, height: 30 },
  levelProgressCard: { margin: 16, marginTop: 0, marginBottom: 24, padding: 20 },
  levelProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  levelProgressLabel: {},
  levelProgressPercent: { fontWeight: '600' },
  progressBarContainer: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  nextLevelText: {},
});

export default MainScreen;