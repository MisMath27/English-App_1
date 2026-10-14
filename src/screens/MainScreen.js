import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../context/ThemeContext';
import {
  loadUserStats,
  loadWords,
  loadDailyHistory,
} from '../utils/progressStorage';

const { width } = Dimensions.get('window');

// ============================================================
//  БАЗА ЦИТАТ (110+)
// ============================================================
const QUOTES_DATABASE = [
  { id: 1, text: "The limits of my language mean the limits of my world.", author: "Ludwig Wittgenstein" },
  { id: 2, text: "Language is the road map of a culture. It tells you where its people come from and where they are going.", author: "Rita Mae Brown" },
  { id: 3, text: "Learning another language is not only learning different words for the same things, but learning another way to think about things.", author: "Flora Lewis" },
  { id: 4, text: "You live a new life for every new language you speak. If you know only one language, you live only once.", author: "Czech proverb" },
  { id: 5, text: "A different language is a different vision of life.", author: "Federico Fellini" },
  { id: 6, text: "To learn a language is to have one more window from which to look at the world.", author: "Chinese proverb" },
  { id: 7, text: "Language is the blood of the soul into which thoughts run and out of which they grow.", author: "Oliver Wendell Holmes" },
  { id: 8, text: "Learning is a treasure that will follow its owner everywhere.", author: "Chinese proverb" },
  { id: 9, text: "Knowledge is power.", author: "Francis Bacon" },
  { id: 10, text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
  { id: 11, text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X" },
  { id: 12, text: "The only thing that interferes with my learning is my education.", author: "Albert Einstein" },
  { id: 13, text: "Tell me and I forget, teach me and I may remember, involve me and I learn.", author: "Benjamin Franklin" },
  { id: 14, text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { id: 15, text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { id: 16, text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { id: 17, text: "Our greatest glory is not in never falling, but in rising every time we fall.", author: "Confucius" },
  { id: 18, text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { id: 19, text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { id: 20, text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { id: 21, text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { id: 22, text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { id: 23, text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { id: 24, text: "You only live once, but if you do it right, once is enough.", author: "Mae West" },
  { id: 25, text: "It is never too late to be what you might have been.", author: "George Eliot" },
  { id: 26, text: "Everything has beauty, but not everyone sees it.", author: "Confucius" },
  { id: 27, text: "Try not to become a man of success, but rather try to become a man of value.", author: "Albert Einstein" },
  { id: 28, text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
  { id: 29, text: "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.", author: "Albert Einstein" },
  { id: 30, text: "I think, therefore I am.", author: "Rene Descartes" },
  { id: 31, text: "To be or not to be, that is the question.", author: "William Shakespeare" },
  { id: 32, text: "The unexamined life is not worth living.", author: "Socrates" },
  { id: 33, text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
  { id: 34, text: "The journey is the destination.", author: "Dan Eldon" },
  { id: 35, text: "Do not go where the path may lead, go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
  { id: 36, text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese proverb" },
  { id: 37, text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { id: 38, text: "Less is more.", author: "Ludwig Mies van der Rohe" },
  { id: 39, text: "The only source of knowledge is experience.", author: "Albert Einstein" },
  { id: 40, text: "Imagination is more important than knowledge.", author: "Albert Einstein" },
  { id: 41, text: "If you can dream it, you can do it.", author: "Walt Disney" },
  { id: 42, text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { id: 43, text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { id: 44, text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
  { id: 45, text: "The only thing standing between you and your goal is the story you keep telling yourself.", author: "Jordan Belfort" },
  { id: 46, text: "Nothing is impossible. The word itself says 'I'm possible'!", author: "Audrey Hepburn" },
  { id: 47, text: "Your limitation—it's only your imagination.", author: "Unknown" },
  { id: 48, text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { id: 49, text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
  { id: 50, text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
  { id: 51, text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { id: 52, text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  { id: 53, text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { id: 54, text: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
  { id: 55, text: "Failure is the condiment that gives success its flavor.", author: "Truman Capote" },
  { id: 56, text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
  { id: 57, text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { id: 58, text: "Success is not the key to happiness. Happiness is the key to success.", author: "Albert Schweitzer" },
  { id: 59, text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { id: 60, text: "Make each day your masterpiece.", author: "John Wooden" },
  { id: 61, text: "Time is what we want most, but what we use worst.", author: "William Penn" },
  { id: 62, text: "They always say time changes things, but you actually have to change them yourself.", author: "Andy Warhol" },
  { id: 63, text: "Change your thoughts and you change your world.", author: "Norman Vincent Peale" },
  { id: 64, text: "It is not the strongest of the species that survives, nor the most intelligent, but the one most responsive to change.", author: "Charles Darwin" },
  { id: 65, text: "Every moment is a fresh beginning.", author: "T.S. Eliot" },
  { id: 66, text: "The only way to make sense out of change is to plunge into it, move with it, and join the dance.", author: "Alan Watts" },
  { id: 67, text: "No one can go back and start a new beginning, but anyone can start today and make a new ending.", author: "Maria Robinson" },
  { id: 68, text: "Yesterday is history, tomorrow is a mystery, today is a gift.", author: "Eleanor Roosevelt" },
  { id: 69, text: "The secret of change is to focus all of your energy not on fighting the old, but on building the new.", author: "Socrates" },
  { id: 70, text: "Better to light a candle than to curse the darkness.", author: "Chinese proverb" },
  { id: 71, text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
  { id: 72, text: "I know that I am intelligent, because I know that I know nothing.", author: "Socrates" },
  { id: 73, text: "The mind is everything. What you think you become.", author: "Buddha" },
  { id: 74, text: "You cannot find peace by avoiding life.", author: "Virginia Woolf" },
  { id: 75, text: "The only thing necessary for the triumph of evil is for good men to do nothing.", author: "Edmund Burke" },
  { id: 76, text: "Speak only if it improves upon the silence.", author: "Mahatma Gandhi" },
  { id: 77, text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama" },
  { id: 78, text: "The purpose of life is a life of purpose.", author: "Robert Byrne" },
  { id: 79, text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" },
  { id: 80, text: "In the midst of winter, I found there was, within me, an invincible summer.", author: "Albert Camus" },
  { id: 81, text: "Courage is not the absence of fear, but the triumph over it.", author: "Nelson Mandela" },
  { id: 82, text: "Fear is the path to the dark side. Fear leads to anger. Anger leads to hate. Hate leads to suffering.", author: "Yoda" },
  { id: 83, text: "The cave you fear to enter holds the treasure you seek.", author: "Joseph Campbell" },
  { id: 84, text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { id: 85, text: "The greatest risk is not taking one.", author: "Unknown" },
  { id: 86, text: "Life is like riding a bicycle. To keep your balance, you must keep moving.", author: "Albert Einstein" },
  { id: 87, text: "Fear is only as deep as the mind allows.", author: "Japanese proverb" },
  { id: 88, text: "Bravery is not the absence of fear. Bravery is feeling the fear and doing it anyway.", author: "Unknown" },
  { id: 89, text: "The biggest risk is not taking any risk.", author: "Mark Zuckerberg" },
  { id: 90, text: "It is often in the darkest skies that we see the brightest stars.", author: "Richard Evans" },
  { id: 91, text: "The future is not something we enter. The future is something we create.", author: "Leonard Sweet" },
  { id: 92, text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { id: 93, text: "Hope is the only thing stronger than fear.", author: "The Hunger Games" },
  { id: 94, text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { id: 95, text: "Fortune favors the brave.", author: "Terence" },
  { id: 96, text: "Great minds have purposes, others have wishes.", author: "Washington Irving" },
  { id: 97, text: "Whether you think you can or you think you can't—you're right.", author: "Henry Ford" },
  { id: 98, text: "It's not the years in your life that count. It's the life in your years.", author: "Abraham Lincoln" },
  { id: 99, text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { id: 100, text: "Sometimes the smallest things take up the most room in your heart.", author: "Winnie the Pooh" },
  { id: 101, text: "Life isn't about finding yourself. Life is about creating yourself.", author: "George Bernard Shaw" },
  { id: 102, text: "The only way out is through.", author: "Robert Frost" },
  { id: 103, text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { id: 104, text: "The purpose of our lives is to be happy.", author: "Dalai Lama" },
  { id: 105, text: "A champion is afraid of losing. Everyone else is afraid of winning.", author: "Billie Jean King" },
  { id: 106, text: "The worst enemy to creativity is self-doubt.", author: "Sylvia Plath" },
  { id: 107, text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { id: 108, text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { id: 109, text: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington" },
  { id: 110, text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
];

const MainScreen = ({ navigation }) => {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [vocabularySize, setVocabularySize] = useState({
    total: 0,
    learned: 0,
    inProgress: 0,
    toReview: 0,
  });
  const [quote, setQuote] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [userName, setUserName] = useState('');
  const [userData, setUserData] = useState({
    streakDays: 0,
    accuracy: 0,
    weeklyProgress: 0,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ============================================================
  //  ЦИТАТА ДНЯ
  // ============================================================
  const getDailyQuote = async () => {
    try {
      const today = new Date().toDateString();
      const storedDate = await AsyncStorage.getItem('quoteDate');
      const storedQuote = await AsyncStorage.getItem('dailyQuote');

      if (storedDate === today && storedQuote) {
        setQuote(JSON.parse(storedQuote));
        return;
      }

      const usedIdsJson = await AsyncStorage.getItem('usedQuoteIds');
      let usedIds = usedIdsJson ? JSON.parse(usedIdsJson) : [];

      if (usedIds.length >= QUOTES_DATABASE.length) {
        usedIds = [];
      }

      const availableQuotes = QUOTES_DATABASE.filter(q => !usedIds.includes(q.id));
      let randomQuote;

      if (availableQuotes.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableQuotes.length);
        randomQuote = availableQuotes[randomIndex];
      } else {
        const randomIndex = Math.floor(Math.random() * QUOTES_DATABASE.length);
        randomQuote = QUOTES_DATABASE[randomIndex];
        usedIds = [];
      }

      const newUsedIds = [...usedIds, randomQuote.id];

      await AsyncStorage.setItem('quoteDate', today);
      await AsyncStorage.setItem('dailyQuote', JSON.stringify(randomQuote));
      await AsyncStorage.setItem('usedQuoteIds', JSON.stringify(newUsedIds));

      setQuote(randomQuote);
    } catch (error) {
      console.log('Ошибка загрузки цитаты:', error);
      setQuote(QUOTES_DATABASE[0]);
    }
  };

  // ============================================================
  //  ЖИЗНЕННЫЙ ЦИКЛ
  // ============================================================
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Перезагружаем данные при каждом фокусе экрана
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
      getDailyQuote();
    });
    return unsubscribe;
  }, [navigation, selectedPeriod]);

  // ============================================================
  //  ЗАГРУЗКА ДАННЫХ
  // ============================================================
  const loadUserData = async () => {
    try {
      setLoading(true);

      const savedName = await AsyncStorage.getItem('userName');
      if (savedName) setUserName(savedName);

      // Слова из progressStorage
      const words = (await loadWords()) || [];

      const total = words.length;
      const learned = words.filter(w => w.isLearned).length;
      const inProgress = words.filter(w => w.reviewCount > 0 && !w.isLearned).length;
      const toReview = learned;

      setVocabularySize({ total, learned, inProgress, toReview });

      // Реальная статистика пользователя
      const stats = await loadUserStats();
      setUserData({
        streakDays: stats.streakDays || 0,
        accuracy: stats.accuracy || 0,
        weeklyProgress: stats.weeklyProgress || 0,
      });

      // Реальный график
      await generateRealChartData(selectedPeriod);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      setLoading(false);
    }
  };

  // ============================================================
  //  ГРАФИК — РЕАЛЬНЫЕ ДАННЫЕ ИЗ dailyStatsHistory
  // ============================================================
  const generateRealChartData = async (period) => {
    try {
      const history = await loadDailyHistory();
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
        // 4 недели назад
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
        // Год — по месяцам (6 последних)
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

      // Если все данные нулевые — подставим нули, чтобы график отрисовался
      const hasData = learnedData.some(v => v > 0) || reviewedData.some(v => v > 0);

      setChartData({
        labels,
        datasets: [
          {
            data: hasData ? learnedData : learnedData.map(() => 0),
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          },
          {
            data: hasData ? reviewedData : reviewedData.map(() => 0),
            color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          },
        ],
      });
    } catch (error) {
      console.log('Ошибка генерации графика:', error);
      setChartData({
        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        datasets: [
          { data: [0, 0, 0, 0, 0, 0, 0], color: (o = 1) => `rgba(76, 175, 80, ${o})` },
          { data: [0, 0, 0, 0, 0, 0, 0], color: (o = 1) => `rgba(33, 150, 243, ${o})` },
        ],
      });
    }
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    Animated.sequence([
      Animated.timing(progressAnim, { toValue: 0.5, duration: 150, useNativeDriver: false }),
      Animated.timing(progressAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();
    generateRealChartData(period);
  };

  // ============================================================
  //  УРОВЕНЬ СЛОВАРНОГО ЗАПАСА
  // ============================================================
  const getVocabularyLevel = (count) => {
    if (count >= 2000) return { label: 'Продвинутый', color: '#9C27B0' };
    if (count >= 1000) return { label: 'Средний', color: '#2196F3' };
    if (count >= 500) return { label: 'Начинающий', color: '#4CAF50' };
    return { label: 'Новичок', color: '#FF9800' };
  };

  const level = getVocabularyLevel(vocabularySize.learned);

  // ============================================================
  //  LOADING
  // ============================================================
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
          <Icon name="school" size={60} color={colors.primary} />
        </Animated.View>
        <Animated.Text
          style={[styles.loadingText, { color: colors.textSecondary, opacity: fadeAnim }]}
        >
          Загружаем ваш прогресс...
        </Animated.Text>
      </View>
    );
  }

  // ============================================================
  //  RENDER
  // ============================================================
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Цитата дня */}
      <Animated.View
        style={[
          styles.quoteContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.quoteGradient}
        >
          <Icon
            name="format-quote"
            size={24}
            color="rgba(255,255,255,0.3)"
            style={styles.quoteIcon}
          />
          <Text style={styles.quoteText}>"{quote?.text}"</Text>
          <Text style={styles.quoteAuthor}>— {quote?.author}</Text>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={[styles.welcomeUser, { color: colors.text }]}>
          Привет, {userName || 'Друг'}!
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {vocabularySize.total > 0
            ? `Ты выучил ${vocabularySize.learned} слов`
            : 'Начни учить слова прямо сейчас!'}
        </Text>
      </Animated.View>

      {vocabularySize.total === 0 && !loading && (
        <View style={styles.welcomeContainer}>
          <Icon name="emoji-emotions" size={60} color={colors.primary} />
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>
            Добро пожаловать! 🎉
          </Text>
          <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
            Начните учить слова, и здесь появится ваш прогресс
          </Text>
          <TouchableOpacity
            style={styles.welcomeButton}
            onPress={() => navigation.navigate('Учить')}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.welcomeButtonGradient}
            >
              <Text style={styles.welcomeButtonText}>Начать изучение</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {vocabularySize.total > 0 && (
        <>
          <GlassCard style={styles.vocabCard}>
            <View style={styles.vocabHeader}>
              <Text style={[styles.vocabTitle, { color: colors.text }]}>
                Мой словарный запас
              </Text>
              <View style={[styles.levelBadge, { backgroundColor: level.color + '20' }]}>
                <Text style={[styles.levelText, { color: level.color }]}>
                  {level.label}
                </Text>
              </View>
            </View>
            <View style={styles.vocabMainStat}>
              <Text style={[styles.vocabMainNumber, { color: colors.primary }]}>
                {vocabularySize.learned}
              </Text>
              <Text style={[styles.vocabMainLabel, { color: colors.textSecondary }]}>
                выучено слов
              </Text>
            </View>
            <View style={styles.vocabSecondaryStats}>
              <View style={styles.vocabStatItem}>
                <Text style={[styles.vocabStatNumber, { color: colors.text }]}>
                  {vocabularySize.total}
                </Text>
                <Text style={[styles.vocabStatLabel, { color: colors.textSecondary }]}>
                  всего
                </Text>
              </View>
              <View style={[styles.vocabStatDivider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.vocabStatItem}>
                <Text style={[styles.vocabStatNumber, { color: colors.text }]}>
                  {vocabularySize.inProgress}
                </Text>
                <Text style={[styles.vocabStatLabel, { color: colors.textSecondary }]}>
                  в процессе
                </Text>
              </View>
              <View style={[styles.vocabStatDivider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.vocabStatItem}>
                <Text style={[styles.vocabStatNumber, { color: colors.text }]}>
                  {vocabularySize.toReview}
                </Text>
                <Text style={[styles.vocabStatLabel, { color: colors.textSecondary }]}>
                  к повторению
                </Text>
              </View>
            </View>
          </GlassCard>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Учить')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.actionGradient}
              >
                <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
                  <Icon name="menu-book" size={28} color="#fff" />
                </Animated.View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionText}>Учить слова</Text>
                  <Text style={styles.actionSubtext}>
                    {vocabularySize.inProgress > 0
                      ? `Осталось ${vocabularySize.total - vocabularySize.learned} слов`
                      : 'Начните изучение'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.reviewButton]}
              onPress={() => navigation.navigate('Учить', { tab: 'review' })}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.secondary, '#0D6EFD']}
                style={styles.actionGradient}
              >
                <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
                  <Icon name="autorenew" size={28} color="#fff" />
                </Animated.View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionText}>Повторить</Text>
                  <Text style={styles.actionSubtext}>
                    {vocabularySize.toReview > 0
                      ? `${vocabularySize.toReview} слов к повторению`
                      : 'Все выучено!'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <GlassCard style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>
                Динамика изучения
              </Text>
              <View style={styles.periodSelector}>
                {['week', 'month', 'year'].map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodButton, selectedPeriod === p && styles.activePeriod]}
                    onPress={() => handlePeriodChange(p)}
                  >
                    <Text
                      style={[
                        styles.periodText,
                        selectedPeriod === p && styles.activePeriodText,
                      ]}
                    >
                      {p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Год'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {chartData && chartData.labels && chartData.labels.length > 0 && (
              <Animated.View style={{ transform: [{ scale: progressAnim }] }}>
                <BarChart
                  data={{
                    labels: chartData.labels,
                    datasets: chartData.datasets,
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
                />
              </Animated.View>
            )}

            {(!chartData ||
              !chartData.datasets ||
              chartData.datasets.every(d => d.data.every(v => v === 0))) && (
              <View style={styles.emptyChart}>
                <Icon name="bar-chart" size={40} color={colors.textSecondary} />
                <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>
                  Пока нет данных. Начните учить слова!
                </Text>
              </View>
            )}

            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  Выучено
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  Повторено
                </Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard style={styles.statsCard}>
            <View style={styles.additionalStats}>
              <View style={styles.additionalStat}>
                <Icon name="whatshot" size={20} color="#FF9800" />
                <Text style={[styles.additionalStatValue, { color: colors.text }]}>
                  {userData.streakDays || 0}
                </Text>
                <Text style={[styles.additionalStatLabel, { color: colors.textSecondary }]}>
                  дней подряд
                </Text>
              </View>
              <View
                style={[styles.additionalStatDivider, { backgroundColor: colors.cardBorder }]}
              />
              <View style={styles.additionalStat}>
                <Icon name="check-circle" size={20} color={colors.primary} />
                <Text style={[styles.additionalStatValue, { color: colors.text }]}>
                  {userData.accuracy || 0}%
                </Text>
                <Text style={[styles.additionalStatLabel, { color: colors.textSecondary }]}>
                  прогресс
                </Text>
              </View>
              <View
                style={[styles.additionalStatDivider, { backgroundColor: colors.cardBorder }]}
              />
              <View style={styles.additionalStat}>
                <Icon name="flag" size={20} color={colors.secondary} />
                <Text style={[styles.additionalStatValue, { color: colors.text }]}>
                  {userData.weeklyProgress || 0}%
                </Text>
                <Text style={[styles.additionalStatLabel, { color: colors.textSecondary }]}>
                  цель недели
                </Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard style={styles.levelProgressCard}>
            <View style={styles.levelProgressHeader}>
              <Text style={[styles.levelProgressLabel, { color: colors.textSecondary }]}>
                Прогресс к следующему уровню
              </Text>
              <Text style={[styles.levelProgressPercent, { color: colors.primary }]}>
                {vocabularySize.total > 0
                  ? Math.min(
                      Math.round((vocabularySize.learned / vocabularySize.total) * 100),
                      100
                    )
                  : 0}
                %
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${
                      vocabularySize.total > 0
                        ? Math.min(
                            (vocabularySize.learned / vocabularySize.total) * 100,
                            100
                          )
                        : 0
                    }%`,
                    backgroundColor: level.color,
                  },
                ]}
              />
            </View>
            <Text style={[styles.nextLevelText, { color: colors.textSecondary }]}>
              {vocabularySize.learned >= 200
                ? 'Вы на продвинутом уровне!'
                : `До следующего уровня: ${
                    vocabularySize.learned >= 100
                      ? 200 - vocabularySize.learned
                      : vocabularySize.learned >= 50
                      ? 100 - vocabularySize.learned
                      : 50 - vocabularySize.learned
                  } слов`}
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
  loadingText: { marginTop: 16, fontSize: 16 },

  quoteContainer: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quoteGradient: { padding: 20, position: 'relative' },
  quoteIcon: { position: 'absolute', top: 10, right: 15 },
  quoteText: {
    fontSize: 16,
    color: '#fff',
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
  },

  header: { padding: 24, paddingTop: 0 },
  welcomeUser: { fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 14, marginTop: 4 },

  welcomeContainer: { alignItems: 'center', padding: 40 },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  welcomeButton: { borderRadius: 16, overflow: 'hidden' },
  welcomeButtonGradient: { paddingHorizontal: 32, paddingVertical: 14 },
  welcomeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  vocabCard: { margin: 16, marginTop: 0, padding: 20 },
  vocabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  vocabTitle: { fontSize: 18, fontWeight: '600' },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  levelText: { fontSize: 12, fontWeight: '600' },
  vocabMainStat: { alignItems: 'center', marginBottom: 16 },
  vocabMainNumber: { fontSize: 48, fontWeight: 'bold' },
  vocabMainLabel: { fontSize: 14, marginTop: 4 },
  vocabSecondaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  vocabStatItem: { alignItems: 'center', flex: 1 },
  vocabStatNumber: { fontSize: 20, fontWeight: '600' },
  vocabStatLabel: { fontSize: 11, marginTop: 2 },
  vocabStatDivider: { width: 1, height: 30 },

  actionsContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  reviewButton: { marginLeft: 8 },
  actionGradient: {
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionTextContainer: { marginLeft: 12 },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  actionSubtext: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },

  chartContainer: { margin: 16, marginTop: 0, padding: 16 },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: { fontSize: 16, fontWeight: '600' },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 2,
  },
  periodButton: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 18 },
  activePeriod: { backgroundColor: '#4CAF50' },
  periodText: { fontSize: 12, color: '#B0B0C0' },
  activePeriodText: { color: '#fff', fontWeight: '500' },
  chart: { borderRadius: 16, marginVertical: 8 },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChartText: { marginTop: 8, fontSize: 14, textAlign: 'center' },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  legendText: { fontSize: 11 },

  statsCard: { margin: 16, marginTop: 0, padding: 16 },
  additionalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  additionalStat: { alignItems: 'center', flex: 1 },
  additionalStatValue: { fontSize: 18, fontWeight: '600', marginTop: 4 },
  additionalStatLabel: { fontSize: 11, marginTop: 2 },
  additionalStatDivider: { width: 1, height: 30 },

  levelProgressCard: { margin: 16, marginTop: 0, marginBottom: 24, padding: 20 },
  levelProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelProgressLabel: { fontSize: 13 },
  levelProgressPercent: { fontSize: 13, fontWeight: '600' },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: { height: '100%', borderRadius: 3 },
  nextLevelText: { fontSize: 12 },
});

export default MainScreen;