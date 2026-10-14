import AsyncStorage from '@react-native-async-storage/async-storage';

const WORDS_KEY = '@english_app:words';
const POSTPONED_KEY = '@english_app:postponedIds';
const SETTINGS_KEY = '@english_app:userSettings';
const DAILY_STATS_KEY = '@english_app:dailyStats';
const DAILY_HISTORY_KEY = '@english_app:dailyStatsHistory';
const REVIEWED_WORDS_KEY = '@english_app:reviewedWords';
const CELEBRATION_KEY = '@english_app:celebrationShown';
const USER_STATS_KEY = '@english_app:userStats';
const STREAK_DAYS_KEY = '@english_app:streakDays';
const LAST_ACTIVE_KEY = '@english_app:lastActiveDate';

// ============ СЛОВА ============
export const saveWords = async (words) => {
  try {
    await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(words));
  } catch (e) {
    console.log('saveWords error:', e);
  }
};

export const loadWords = async () => {
  try {
    const json = await AsyncStorage.getItem(WORDS_KEY);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.log('loadWords error:', e);
    return null;
  }
};

// ============ ОТЛОЖЕННЫЕ ============
export const savePostponedIds = async (ids) => {
  try {
    await AsyncStorage.setItem(POSTPONED_KEY, JSON.stringify(ids));
  } catch (e) {
    console.log('savePostponedIds error:', e);
  }
};

export const loadPostponedIds = async () => {
  try {
    const json = await AsyncStorage.getItem(POSTPONED_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.log('loadPostponedIds error:', e);
    return [];
  }
};

// ============ НАСТРОЙКИ ============
export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.log('saveSettings error:', e);
  }
};

export const loadSettings = async () => {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    return json ? JSON.parse(json) : { wordsPerDay: 30, reviewCount: 15 };
  } catch (e) {
    return { wordsPerDay: 30, reviewCount: 15 };
  }
};

// ============ ДНЕВНАЯ СТАТИСТИКА (с историей) ============
export const saveDailyStats = async (type) => {
  try {
    const today = new Date().toDateString();
    const saved = await AsyncStorage.getItem(DAILY_STATS_KEY);
    let stats = saved ? JSON.parse(saved) : { date: today, learned: 0, reviewed: 0 };

    // Если день сменился — сохраняем вчерашние в историю
    if (stats.date !== today) {
      const historyJson = await AsyncStorage.getItem(DAILY_HISTORY_KEY);
      const history = historyJson ? JSON.parse(historyJson) : {};
      history[stats.date] = {
        learned: stats.learned || 0,
        reviewed: stats.reviewed || 0,
      };
      await AsyncStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(history));
      stats = { date: today, learned: 0, reviewed: 0 };
    }

    if (type === 'learn') stats.learned = (stats.learned || 0) + 1;
    if (type === 'review') stats.reviewed = (stats.reviewed || 0) + 1;

    await AsyncStorage.setItem(DAILY_STATS_KEY, JSON.stringify(stats));
    return stats;
  } catch (e) {
    console.log('saveDailyStats error:', e);
    return { date: new Date().toDateString(), learned: 0, reviewed: 0 };
  }
};

export const loadDailyStats = async () => {
  try {
    const today = new Date().toDateString();
    const json = await AsyncStorage.getItem(DAILY_STATS_KEY);
    if (!json) return { date: today, learned: 0, reviewed: 0 };
    const stats = JSON.parse(json);
    if (stats.date !== today) {
      return { date: today, learned: 0, reviewed: 0 };
    }
    return stats;
  } catch (e) {
    return { date: new Date().toDateString(), learned: 0, reviewed: 0 };
  }
};

export const loadDailyHistory = async () => {
  try {
    const json = await AsyncStorage.getItem(DAILY_HISTORY_KEY);
    return json ? JSON.parse(json) : {};
  } catch (e) {
    return {};
  }
};

// ============ ПОВТОРЁННЫЕ СЛОВА (за сегодня) ============
export const saveReviewedWords = async (ids) => {
  try {
    const today = new Date().toDateString();
    await AsyncStorage.setItem(REVIEWED_WORDS_KEY, JSON.stringify({ date: today, ids }));
  } catch (e) {
    console.log('saveReviewedWords error:', e);
  }
};

export const loadReviewedWords = async () => {
  try {
    const today = new Date().toDateString();
    const json = await AsyncStorage.getItem(REVIEWED_WORDS_KEY);
    if (!json) return [];
    const parsed = JSON.parse(json);
    if (parsed.date !== today) {
      await AsyncStorage.setItem(REVIEWED_WORDS_KEY, JSON.stringify({ date: today, ids: [] }));
      return [];
    }
    return parsed.ids || [];
  } catch (e) {
    return [];
  }
};

// ============ ПОЗДРАВЛЕНИЕ ============
export const saveCelebrationShown = async (shown) => {
  try {
    const today = new Date().toDateString();
    await AsyncStorage.setItem(CELEBRATION_KEY, JSON.stringify({ date: today, shown }));
  } catch (e) {
    console.log('saveCelebrationShown error:', e);
  }
};

export const loadCelebrationShown = async () => {
  try {
    const today = new Date().toDateString();
    const json = await AsyncStorage.getItem(CELEBRATION_KEY);
    if (!json) return false;
    const parsed = JSON.parse(json);
    if (parsed.date !== today) return false;
    return parsed.shown || false;
  } catch (e) {
    return false;
  }
};

// ============ СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ (streak, accuracy) ============
export const updateUserStats = async (words) => {
  try {
    const today = new Date().toDateString();
    const lastActive = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
    const savedStreak = await AsyncStorage.getItem(STREAK_DAYS_KEY);
    let streakDays = savedStreak ? parseInt(savedStreak, 10) : 0;

    // Обновляем streak при первом действии за день
    if (lastActive !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastActive === yesterday.toDateString()) {
        streakDays += 1;
      } else {
        streakDays = 1;
      }

      await AsyncStorage.setItem(LAST_ACTIVE_KEY, today);
      await AsyncStorage.setItem(STREAK_DAYS_KEY, String(streakDays));
    }

    const total = words.length;
    const learned = words.filter(w => w.isLearned).length;
    const accuracy = total > 0 ? Math.round((learned / total) * 100) : 0;

    // Цель недели: 100 слов в неделю максимум
    const reviewedToday = await loadReviewedWords();
    const weeklyProgress = Math.min(Math.round((reviewedToday.length / 50) * 100), 100);

    const stats = { streakDays, accuracy, weeklyProgress };
    await AsyncStorage.setItem(USER_STATS_KEY, JSON.stringify(stats));
    return stats;
  } catch (e) {
    console.log('updateUserStats error:', e);
    return { streakDays: 0, accuracy: 0, weeklyProgress: 0 };
  }
};

export const loadUserStats = async () => {
  try {
    const json = await AsyncStorage.getItem(USER_STATS_KEY);
    return json ? JSON.parse(json) : { streakDays: 0, accuracy: 0, weeklyProgress: 0 };
  } catch (e) {
    return { streakDays: 0, accuracy: 0, weeklyProgress: 0 };
  }
};

// ============ СБРОС ВСЕГО ============
export const resetAllProgress = async () => {
  try {
    await AsyncStorage.multiRemove([
      WORDS_KEY,
      POSTPONED_KEY,
      DAILY_STATS_KEY,
      DAILY_HISTORY_KEY,
      REVIEWED_WORDS_KEY,
      CELEBRATION_KEY,
      USER_STATS_KEY,
      STREAK_DAYS_KEY,
      LAST_ACTIVE_KEY,
    ]);
  } catch (e) {
    console.log('resetAllProgress error:', e);
  }
};