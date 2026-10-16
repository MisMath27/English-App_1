import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  Animated,
  Easing,
  Share,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { loadSettings, saveSettings, loadWords } from '../utils/progressStorage';

const SETTINGS_KEY = '@english_app:userSettings';

const SettingsScreen = ({ navigation }) => {
  const { isDarkMode, toggleTheme, colors, setFontSize, fontSizeMultiplier } = useTheme();
  const { t, setLanguage } = useTranslation();

  const [settings, setSettings] = useState({
    notifications: true,
    soundEffects: true,
    autoPlay: false,
    dailyReminder: true,
    reminderTime: '20:00',
    wordsPerDay: 30,
    reviewCount: 15,
    language: 'ru',
    fontSize: 'medium',
  });

  const [user, setUser] = useState({
    name: 'Пользователь',
    email: 'user@example.com',
    level: 'A1',
    joinDate: new Date().toISOString().split('T')[0],
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [tempValue, setTempValue] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const saved = await loadSettings();
      const rawSaved = await AsyncStorage.getItem(SETTINGS_KEY);
      let merged;

      if (rawSaved) {
        const parsed = JSON.parse(rawSaved);
        merged = {
          notifications: parsed.notifications ?? true,
          soundEffects: parsed.soundEffects ?? true,
          autoPlay: parsed.autoPlay ?? false,
          dailyReminder: parsed.dailyReminder ?? true,
          reminderTime: parsed.reminderTime || '20:00',
          wordsPerDay: parsed.wordsPerDay || 30,
          reviewCount: parsed.reviewCount || 15,
          language: parsed.language || 'ru',
          fontSize: parsed.fontSize || 'medium',
        };
      } else {
        merged = {
          notifications: true,
          soundEffects: true,
          autoPlay: false,
          dailyReminder: true,
          reminderTime: '20:00',
          wordsPerDay: saved.wordsPerDay || 30,
          reviewCount: saved.reviewCount || 15,
          language: 'ru',
          fontSize: 'medium',
        };
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      }

      setSettings(merged);

      const savedUser = await AsyncStorage.getItem('userData');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.log('Ошибка парсинга userData:', e);
        }
      }

      const words = (await loadWords()) || [];
      const learned = words.filter((w) => w.isLearned).length;
      const level =
        learned >= 200 ? 'C1' :
        learned >= 150 ? 'B2' :
        learned >= 100 ? 'B1' :
        learned >= 50 ? 'A2' : 'A1';

      setUser((prev) => ({ ...prev, level }));
    } catch (error) {
      console.log('Ошибка загрузки:', error);
    }
  };

  const persistSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      await saveSettings({
        wordsPerDay: newSettings.wordsPerDay,
        reviewCount: newSettings.reviewCount,
      });
    } catch (error) {
      console.log('Ошибка сохранения настроек:', error);
    }
  };

  const saveUserData = async (newUser) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(newUser));
    } catch (error) {
      console.log('Ошибка сохранения:', error);
    }
  };

  const handleToggle = useCallback((key) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      persistSettings(next);
      return next;
    });
  }, []);

  const handleChangeValue = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      persistSettings(next);
      return next;
    });
    if (key === 'fontSize') setFontSize(value);
    if (key === 'language') setLanguage(value);
  }, [setFontSize, setLanguage]);

  const handleNotificationsToggle = async () => {
    const newValue = !settings.notifications;
    if (newValue) {
      try {
        const perm = await notifee.requestPermission();
        if (perm.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
          Alert.alert(t('settings_notifications'), t('settings_notifications_desc'));
          return;
        }
        await notifee.createChannel({ id: 'default', name: 'Default' });
      } catch (e) {
        Alert.alert('Error', e.message);
        return;
      }
    }
    const newSettings = { ...settings, notifications: newValue };
    setSettings(newSettings);
    persistSettings(newSettings);
  };

  const sendTestNotification = async () => {
    try {
      await notifee.displayNotification({
        title: t('settings_notifications'),
        body: t('settings_notifications_desc'),
        android: { channelId: 'default', smallIcon: 'ic_launcher', pressAction: { id: 'default' } },
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleSoundToggle = () => {
    const newSettings = { ...settings, soundEffects: !settings.soundEffects };
    setSettings(newSettings);
    persistSettings(newSettings);
  };

//  const playTestSound = () => {
//    const sound = new Sound('whoosh.mp3', Sound.MAIN_BUNDLE, (err) => {
//      if (err) {
//        Alert.alert(t('settings_sounds'), t('settings_test_sound'));
//        return;
//      }
//      sound.play((success) => {
//        if (!success) Alert.alert('Error', 'Sound failed');
//        sound.release();
//      });
//    });
//  };

  const handleAutoPlayToggle = () => {
    const newSettings = { ...settings, autoPlay: !settings.autoPlay };
    setSettings(newSettings);
    persistSettings(newSettings);
  };

  const testAutoPlay = async () => {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    Alert.alert(t('settings_autoplay'), parsed.autoPlay ? 'On' : 'Off');
  };

  const openModal = useCallback((type, currentValue) => {
    setModalType(type);
    setTempValue(String(currentValue));
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => setModalVisible(false), []);

  const handleModalSave = useCallback(() => {
    let newValue;
    if (modalType === 'reminderTime') {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(tempValue)) {
        Alert.alert(t('settings_reminder_time'), 'ЧЧ:ММ');
        return;
      }
      newValue = tempValue;
    } else if (modalType === 'wordsPerDay' || modalType === 'reviewCount') {
      const parsed = parseInt(tempValue, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 500) {
        Alert.alert(t('settings_words_per_day'), '1–500');
        return;
      }
      newValue = parsed;
    }
    handleChangeValue(modalType, newValue);
    setModalVisible(false);
  }, [modalType, tempValue, handleChangeValue, t]);

  const handleEditName = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt('Name', 'Enter your name:', [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('save'),
          onPress: async (text) => {
            if (text && text.trim()) {
              const newUser = { ...user, name: text.trim() };
              setUser(newUser);
              await saveUserData(newUser);
            }
          },
        },
      ], 'plain-text', user.name);
    } else {
      Alert.alert('Name', 'Use modal on Android');
    }
  };

  const handleEditEmail = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt('Email', 'Enter your email:', [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('save'),
          onPress: async (text) => {
            if (text && text.trim()) {
              const newUser = { ...user, email: text.trim() };
              setUser(newUser);
              await saveUserData(newUser);
            }
          },
        },
      ], 'plain-text', user.email);
    } else {
      Alert.alert('Email', 'Use modal on Android');
    }
  };

  const handleLogout = () => {
    Alert.alert(t('settings_logout'), '', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('settings_logout'), style: 'destructive', onPress: () => Alert.alert('OK', '') },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: 'EnglishApp: https://englishapp.com', title: 'English App' });
    } catch (e) {
      Alert.alert('Error', 'Share failed');
    }
  };

  const handleFeedback = () => {
    Alert.alert(t('settings_feedback'), 'SupportEnglishApp@gmail.com', [
      { text: 'Email', onPress: () => Linking.openURL('mailto:SupportEnglishApp@gmail.com') },
      { text: t('close'), style: 'cancel' },
    ]);
  };

  const handleClearCache = () => {
    Alert.alert(t('settings_clear_cache'), t('settings_clear_cache_desc'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('settings_clear_cache'),
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove(['quoteDate', 'dailyQuote', 'usedQuoteIds']);
            loadAllData();
          } catch (e) {
            Alert.alert('Error', 'Cache clear failed');
          }
        },
      },
    ]);
  };

  const handleExportData = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const result = {};
      for (const key of allKeys) {
        result[key] = await AsyncStorage.getItem(key);
      }
      const json = JSON.stringify(result, null, 2);
      console.log('=== ЭКСПОРТ ДАННЫХ ===');
      console.log(json);
      console.log('=== КОНЕЦ ЭКСПОРТА ===');

      Alert.alert(
        t('settings_export'),
        'Сохранение работает автоматически.\n\n',
        [
          { text: t('close'), style: 'cancel' },
          {
            text: t('settings_share'),
            onPress: () => {
              Share.share({
                message: json,
                title: 'EnglishApp Backup',
              });
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(t('error'), 'Не удалось экспортировать данные');
    }
  };

  const handleImportData = () => {
    Alert.alert(
      t('settings_import'),
      'Восстановление данных работает автоматически через Google Drive.\n\n' +
      'Чтобы восстановить прогресс после смены устройства:\n\n' +
      '1. Убедитесь, что на старом телефоне включено резервное копирование в Google.\n' +
      '2. На новом устройстве войдите в тот же Google-аккаунт.\n' +
      '3. Установите приложение заново — система сама вернёт ваши данные.\n\n' +
      'Если данные не восстановились — удалите приложение и установите заново.',
      [{ text: t('close'), style: 'cancel' }]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('settings_delete_account'), '', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove([
              '@english_app:words', '@english_app:postponedIds', '@english_app:userSettings',
              '@english_app:dailyStats', '@english_app:dailyStatsHistory', '@english_app:reviewedWords',
              '@english_app:celebrationShown', '@english_app:userStats', '@english_app:streakDays',
              '@english_app:lastActiveDate', 'userData', 'userName', 'userStats',
              'quoteDate', 'dailyQuote', 'usedQuoteIds',
            ]);
            navigation.navigate(t('tab_home'));
          } catch (e) {
            Alert.alert('Error', 'Delete failed');
          }
        },
      },
    ]);
  };

  const handleLanguageSelect = () => {
    Alert.alert(t('settings_language'), t('settings_language_desc'), [
      { text: t('settings_lang_ru'), onPress: () => handleChangeValue('language', 'ru') },
      { text: t('settings_lang_en'), onPress: () => handleChangeValue('language', 'en') },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  const handleFontSizeSelect = () => {
    Alert.alert(t('settings_font_size'), t('settings_font_size_desc'), [
      { text: t('settings_font_small'), onPress: () => handleChangeValue('fontSize', 'small') },
      { text: t('settings_font_medium'), onPress: () => handleChangeValue('fontSize', 'medium') },
      { text: t('settings_font_large'), onPress: () => handleChangeValue('fontSize', 'large') },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  const SettingItem = ({ icon, title, description, type, value, onPress, onToggle, onTest, testLabel }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: colors.cardBorder }]}
      onPress={onPress}
      disabled={type === 'toggle'}
      activeOpacity={type === 'toggle' ? 1 : 0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: colors.primary + '15' }]}>
        <Icon name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.text, fontSize: 16 * fontSizeMultiplier }]}>{title}</Text>
        {description && (
          <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: 12 * fontSizeMultiplier }]}>
            {description}
          </Text>
        )}
        {onTest && (
          <TouchableOpacity onPress={onTest} style={{ marginTop: 6 }}>
            <Text style={[styles.testBtnText, { color: colors.primary, fontSize: 13 * fontSizeMultiplier }]}>
              {testLabel || t('settings_test_flag')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.settingAction}>
        {type === 'toggle' && (
          <Switch
            value={value}
            onValueChange={onToggle}
            trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.primary }}
            thumbColor="#fff"
          />
        )}
        {type === 'value' && (
          <View style={styles.settingValue}>
            <Text style={[styles.settingValueText, { color: colors.primary, fontSize: 14 * fontSizeMultiplier }]}>{value}</Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </View>
        )}
        {type === 'link' && <Icon name="chevron-right" size={20} color={colors.textSecondary} />}
      </View>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 14 * fontSizeMultiplier }]}>{title}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        {/* ─── ПРОФИЛЬ ─── */}
        <Animated.View style={[styles.profileCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.profileGradient}>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatar}>
                <Icon name="person" size={40} color="#fff" />
              </View>
              <View style={styles.profileInfo}>
                <TouchableOpacity onPress={handleEditName}>
                  <Text style={[styles.profileName, { fontSize: 18 * fontSizeMultiplier }]}>{user.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleEditEmail}>
                  <Text style={[styles.profileEmail, { fontSize: 14 * fontSizeMultiplier }]}>{user.email}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.profileEdit} onPress={handleEditName}>
                <Icon name="edit" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileStats}>
              <View style={styles.profileStat}>
                <Text style={[styles.profileStatValue, { fontSize: 20 * fontSizeMultiplier }]}>{user.level}</Text>
                <Text style={[styles.profileStatLabel, { fontSize: 12 * fontSizeMultiplier }]}>{t('settings_level')}</Text>
              </View>
              <View style={styles.profileStatDivider} />
              <View style={styles.profileStat}>
                <Text style={[styles.profileStatValue, { fontSize: 20 * fontSizeMultiplier }]}>
                  {Math.floor((new Date() - new Date(user.joinDate)) / (1000 * 60 * 60 * 24))}
                </Text>
                <Text style={[styles.profileStatLabel, { fontSize: 12 * fontSizeMultiplier }]}>{t('settings_days_with')}</Text>
              </View>
              <View style={styles.profileStatDivider} />
              <View style={styles.profileStat}>
                <Text style={[styles.profileStatValue, { fontSize: 20 * fontSizeMultiplier }]}>
                  {user.level === 'A1' ? t('settings_status_beginner') :
                   user.level === 'A2' ? t('settings_status_elementary') :
                   user.level === 'B1' ? t('settings_status_intermediate') :
                   user.level === 'B2' ? t('settings_status_upper') :
                   user.level === 'C1' ? t('settings_status_advanced') : t('settings_status_expert')}
                </Text>
                <Text style={[styles.profileStatLabel, { fontSize: 12 * fontSizeMultiplier }]}>{t('settings_status')}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ─── ОСНОВНЫЕ ─── */}
        <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
          <SectionHeader title={t('settings_main')} />
          <GlassCard style={styles.settingsCard}>
            <SettingItem
              icon="notifications"
              title={t('settings_notifications')}
              description={t('settings_notifications_desc')}
              type="toggle"
              value={settings.notifications}
              onToggle={handleNotificationsToggle}
              onTest={sendTestNotification}
              testLabel={t('settings_test_notification')}
            />
            <SettingItem
              icon="volume-up"
              title={t('settings_sounds')}
              description={t('settings_sounds_desc')}
              type="toggle"
              value={settings.soundEffects}
              onToggle={handleSoundToggle}
              onTest={() => Alert.alert(t('settings_sounds'), 'Звук временно отключён')}
              testLabel={t('settings_test_sound')}
            />
            <SettingItem
              icon="play-circle"
              title={t('settings_autoplay')}
              description={t('settings_autoplay_desc')}
              type="toggle"
              value={settings.autoPlay}
              onToggle={handleAutoPlayToggle}
              onTest={() => Alert.alert(t('settings_sounds'), 'Звук временно отключён')}
              testLabel={t('settings_test_flag')}
            />
          </GlassCard>
        </Animated.View>

        {/* ─── ОФОРМЛЕНИЕ ─── */}
        <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
          <SectionHeader title={t('settings_appearance')} />
          <GlassCard style={styles.settingsCard}>
            <SettingItem
              icon="dark-mode"
              title={t('settings_dark_theme')}
              description={isDarkMode ? t('settings_dark_on') : t('settings_dark_off')}
              type="toggle"
              value={isDarkMode}
              onToggle={toggleTheme}
            />
            <SettingItem
              icon="text-fields"
              title={t('settings_font_size')}
              description={t('settings_font_size_desc')}
              value={
                settings.fontSize === 'small' ? t('settings_font_small') :
                settings.fontSize === 'medium' ? t('settings_font_medium') : t('settings_font_large')
              }
              type="value"
              onPress={handleFontSizeSelect}
            />
          </GlassCard>
        </Animated.View>

        {/* ─── ОБУЧЕНИЕ ─── */}
        <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
          <SectionHeader title={t('settings_learning')} />
          <GlassCard style={styles.settingsCard}>
            <SettingItem
              icon="calendar-today"
              title={t('settings_daily_reminder')}
              description={t('settings_daily_reminder_desc')}
              type="toggle"
              value={settings.dailyReminder}
              onToggle={() => handleToggle('dailyReminder')}
            />
            {settings.dailyReminder && (
              <SettingItem
                icon="access-time"
                title={t('settings_reminder_time')}
                value={settings.reminderTime}
                type="value"
                onPress={() => openModal('reminderTime', settings.reminderTime)}
              />
            )}
            <SettingItem
              icon="speed"
              title={t('settings_words_per_day')}
              description={t('settings_words_per_day_desc')}
              value={`${settings.wordsPerDay} ${t('settings_words_suffix')}`}
              type="value"
              onPress={() => openModal('wordsPerDay', settings.wordsPerDay)}
            />
            <SettingItem
              icon="autorenew"
              title={t('settings_reviews_per_day')}
              description={t('settings_reviews_per_day_desc')}
              value={`${settings.reviewCount} ${t('settings_words_suffix')}`}
              type="value"
              onPress={() => openModal('reviewCount', settings.reviewCount)}
            />
            <SettingItem
              icon="language"
              title={t('settings_language')}
              description={t('settings_language_desc')}
              value={settings.language === 'ru' ? t('settings_lang_ru') : t('settings_lang_en')}
              type="value"
              onPress={handleLanguageSelect}
            />
          </GlassCard>
        </Animated.View>

        {/* ─── ДАННЫЕ  ─── */}
        <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
          <SectionHeader title={t('settings_data')} />
          <GlassCard style={styles.settingsCard}>
            <SettingItem
              icon="cloud-download"
              title={t('settings_export')}
              description={t('settings_export_desc')}
              type="link"
              onPress={handleExportData}
            />
            <SettingItem
              icon="cloud-upload"
              title={t('settings_import')}
              description={t('settings_import_desc')}
              type="link"
              onPress={handleImportData}
            />
            <SettingItem
              icon="delete-sweep"
              title={t('settings_clear_cache')}
              description={t('settings_clear_cache_desc')}
              type="link"
              onPress={handleClearCache}
            />
          </GlassCard>
        </Animated.View>

        {/* ─── О ПРИЛОЖЕНИИ ─── */}
        <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
          <SectionHeader title={t('settings_about')} />
          <GlassCard style={styles.settingsCard}>
            <SettingItem icon="info" title={t('settings_version')} value="1.0.0" type="value" />
            <SettingItem
              icon="feedback"
              title={t('settings_feedback')}
              type="link"
              onPress={handleFeedback}
            />
            <SettingItem
              icon="star"
              title={t('settings_rate')}
              type="link"
              onPress={() => Alert.alert(t('settings_rate'), '')}
            />
            <SettingItem
              icon="share"
              title={t('settings_share')}
              type="link"
              onPress={handleShare}
            />
            <SettingItem
              icon="description"
              title={t('settings_terms')}
              type="link"
              onPress={() => Alert.alert(t('settings_terms'), '')}
            />
            <SettingItem
              icon="privacy-tip"
              title={t('settings_privacy')}
              type="link"
              onPress={() => Alert.alert(t('settings_privacy'), '')}
            />
          </GlassCard>
        </Animated.View>

        {/* ─── АККАУНТ ─── */}
        <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
          <SectionHeader title={t('settings_account')} />
          <GlassCard style={styles.settingsCard}>
            <TouchableOpacity style={[styles.dangerButton, styles.logoutButton]} onPress={handleLogout}>
              <Icon name="exit-to-app" size={20} color={colors.error} />
              <Text style={[styles.logoutText, { color: colors.error, fontSize: 16 * fontSizeMultiplier }]}>
                {t('settings_logout')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dangerButton, styles.deleteButton, { borderTopColor: colors.cardBorder }]}
              onPress={handleDeleteAccount}
            >
              <Icon name="delete-forever" size={20} color={colors.error} />
              <Text style={[styles.deleteText, { color: colors.error, fontSize: 16 * fontSizeMultiplier }]}>
                {t('settings_delete_account')}
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.cardBorder,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 * fontSizeMultiplier }]}>
                {modalType === 'reminderTime' && t('modal_reminder_time')}
                {modalType === 'wordsPerDay' && t('modal_words_per_day')}
                {modalType === 'reviewCount' && t('modal_reviews_per_day')}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder, fontSize: 16 * fontSizeMultiplier }]}
                value={tempValue}
                onChangeText={setTempValue}
                keyboardType={modalType === 'reminderTime' ? 'default' : 'numeric'}
                placeholder={modalType === 'reminderTime' ? '20:00' : '30'}
                maxLength={modalType === 'reminderTime' ? 5 : 3}
                placeholderTextColor={colors.textMuted}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.modalCancel]} onPress={closeModal}>
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary, fontSize: 16 * fontSizeMultiplier }]}>
                    {t('cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.modalSave]} onPress={handleModalSave}>
                  <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.modalSaveGradient}>
                    <Text style={[styles.modalSaveText, { fontSize: 16 * fontSizeMultiplier }]}>{t('save')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: { margin: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  profileGradient: { padding: 20 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  profileAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  profileInfo: { flex: 1 },
  profileName: { fontWeight: 'bold', color: '#fff' },
  profileEmail: { color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  profileEdit: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  profileStats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  profileStat: { alignItems: 'center', flex: 1 },
  profileStatValue: { fontWeight: 'bold', color: '#fff' },
  profileStatLabel: { color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  profileStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },
  settingsSection: { marginBottom: 16 },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle: { fontWeight: '600', textTransform: 'uppercase' },
  settingsCard: { marginHorizontal: 16, padding: 0, overflow: 'hidden', borderRadius: 16, borderWidth: 1 },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  settingIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingContent: { flex: 1 },
  settingTitle: { fontWeight: '500' },
  settingDescription: { marginTop: 2 },
  settingAction: { marginLeft: 8 },
  settingValue: { flexDirection: 'row', alignItems: 'center' },
  settingValueText: { marginRight: 4 },
  testBtnText: { fontWeight: '600' },
  dangerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 },
  logoutButton: { borderBottomWidth: 0 },
  deleteButton: { borderTopWidth: 1 },
  logoutText: { marginLeft: 8 },
  deleteText: { marginLeft: 8 },
  bottomPadding: { height: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden', borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  modalTitle: { fontWeight: 'bold' },
  modalBody: { padding: 20 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { flex: 1, marginHorizontal: 4, borderRadius: 8, overflow: 'hidden' },
  modalCancel: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, alignItems: 'center' },
  modalCancelText: { fontWeight: '500' },
  modalSave: { overflow: 'hidden' },
  modalSaveGradient: { padding: 14, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: '600' },
});

export default SettingsScreen;