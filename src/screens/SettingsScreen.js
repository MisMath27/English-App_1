import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../context/ThemeContext';
import {
  loadSettings,
  saveSettings,
  loadWords,
} from '../utils/progressStorage';

const SettingsScreen = ({ navigation }) => {
  const { isDarkMode, toggleTheme, colors } = useTheme();

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

  // ⭐ ИСПРАВЛЕНО: используем progressStorage + сохраняем дефолты при первом запуске
  const loadAllData = async () => {
    try {
      // 1. Загружаем настройки через progressStorage
      const saved = await loadSettings();

      // Проверяем, есть ли уже сохранённый объект userSettings
      const rawSaved = await AsyncStorage.getItem('@english_app:userSettings');
      let merged;

      if (rawSaved) {
        // Полный объект есть — берём все поля
        const parsed = JSON.parse(rawSaved);
        merged = {
          notifications: parsed.notifications !== undefined ? parsed.notifications : true,
          soundEffects: parsed.soundEffects !== undefined ? parsed.soundEffects : true,
          autoPlay: parsed.autoPlay || false,
          dailyReminder: parsed.dailyReminder !== undefined ? parsed.dailyReminder : true,
          reminderTime: parsed.reminderTime || '20:00',
          wordsPerDay: parsed.wordsPerDay || 30,
          reviewCount: parsed.reviewCount || 15,
          language: parsed.language || 'ru',
          fontSize: parsed.fontSize || 'medium',
        };
      } else {
        // Первый запуск — сохраняем дефолты в AsyncStorage!
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
        await AsyncStorage.setItem('@english_app:userSettings', JSON.stringify(merged));
      }

      setSettings(merged);

      // 2. Загружаем данные пользователя
      const savedUser = await AsyncStorage.getItem('userData');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.log('Ошибка парсинга userData:', e);
        }
      }

      // 3. Определяем уровень по количеству выученных слов
      const words = (await loadWords()) || [];
      const learned = words.filter(w => w.isLearned).length;
      const level =
        learned >= 200 ? 'C1' :
        learned >= 150 ? 'B2' :
        learned >= 100 ? 'B1' :
        learned >= 50 ? 'A2' : 'A1';

      setUser(prev => ({ ...prev, level }));
    } catch (error) {
      console.log('Ошибка загрузки:', error);
    }
  };

  // ⭐ Сохранение — используем ключ @english_app:userSettings
  const persistSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('@english_app:userSettings', JSON.stringify(newSettings));
      // Также синхронизируем wordsPerDay / reviewCount в progressStorage
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

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    persistSettings(newSettings);
  };

  const handleChangeValue = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    persistSettings(newSettings);
  };

  const openModal = (type, currentValue) => {
    setModalType(type);
    setTempValue(currentValue.toString());
    setModalVisible(true);
  };

  const handleModalSave = () => {
    let newValue;
    if (modalType === 'reminderTime') {
      // Проверка формата ЧЧ:ММ
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(tempValue)) {
        Alert.alert('Неверный формат', 'Введите время в формате ЧЧ:ММ, например 20:00');
        return;
      }
      newValue = tempValue;
    } else if (modalType === 'wordsPerDay') {
      const parsed = parseInt(tempValue, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 500) {
        Alert.alert('Неверное значение', 'Введите число от 1 до 500');
        return;
      }
      newValue = parsed;
    } else if (modalType === 'reviewCount') {
      const parsed = parseInt(tempValue, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 500) {
        Alert.alert('Неверное значение', 'Введите число от 1 до 500');
        return;
      }
      newValue = parsed;
    }
    handleChangeValue(modalType, newValue);
    setModalVisible(false);
  };

  const handleEditName = () => {
    Alert.prompt('Изменить имя', 'Введите ваше имя:', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Сохранить',
        onPress: async (text) => {
          if (text && text.trim()) {
            const newUser = { ...user, name: text.trim() };
            setUser(newUser);
            await saveUserData(newUser);
            await AsyncStorage.setItem('userName', text.trim());
          }
        },
      },
    ], 'plain-text', user.name);
  };

  const handleEditEmail = () => {
    Alert.prompt('Изменить email', 'Введите ваш email:', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Сохранить',
        onPress: async (text) => {
          if (text && text.trim()) {
            const newUser = { ...user, email: text.trim() };
            setUser(newUser);
            await saveUserData(newUser);
          }
        },
      },
    ], 'plain-text', user.email);
  };

  const handleLogout = () => {
    Alert.alert('Выход из аккаунта', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => Alert.alert('Успех', 'Вы вышли') },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Изучайте английский с EnglishApp! Присоединяйтесь: https://englishapp.com',
        title: 'English App',
      });
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось поделиться');
    }
  };

  const handleFeedback = () => {
    Alert.alert('Обратная связь', 'Напишите нам на support@englishapp.com', [
      { text: 'Написать email', onPress: () => Linking.openURL('mailto:support@englishapp.com') },
      { text: 'Закрыть', style: 'cancel' },
    ]);
  };

  // ⭐ ИСПРАВЛЕНО: не удаляем прогресс, только временные данные
  const handleClearCache = () => {
    Alert.alert(
      'Очистка кэша',
      'Удалить временные файлы? Прогресс и настройки сохранены.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          onPress: async () => {
            try {
              // Удаляем только временные данные цитаты и графиков
              await AsyncStorage.multiRemove([
                'quoteDate',
                'dailyQuote',
                'usedQuoteIds',
              ]);
              Alert.alert('Готово', 'Временные данные очищены. Прогресс сохранён.');
              loadAllData();
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось очистить кэш');
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const result = {};
      for (const key of allKeys) {
        result[key] = await AsyncStorage.getItem(key);
      }
      console.log('Экспорт:', result);
      Alert.alert('Экспорт данных', 'Данные выведены в консоль Metro');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось экспортировать данные');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Удаление аккаунта',
      'Действие необратимо. Продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              // Удаляем только пользовательские данные, не всю AS
              await AsyncStorage.multiRemove([
                '@english_app:words',
                '@english_app:postponedIds',
                '@english_app:userSettings',
                '@english_app:dailyStats',
                '@english_app:dailyStatsHistory',
                '@english_app:reviewedWords',
                '@english_app:celebrationShown',
                '@english_app:userStats',
                '@english_app:streakDays',
                '@english_app:lastActiveDate',
                'userData',
                'userName',
                'userStats',
                'quoteDate',
                'dailyQuote',
                'usedQuoteIds',
              ]);
              Alert.alert('Аккаунт удален', 'Все данные удалены');
              navigation.navigate('Главная');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить аккаунт');
            }
          },
        },
      ]
    );
  };

  const SettingItem = ({ icon, title, description, type, value, onPress, onToggle }) => (
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
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {description && (
          <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
            {description}
          </Text>
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
            <Text style={[styles.settingValueText, { color: colors.primary }]}>{value}</Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </View>
        )}
        {type === 'link' && <Icon name="chevron-right" size={20} color={colors.textSecondary} />}
      </View>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[styles.profileCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.profileGradient}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Icon name="person" size={40} color="#fff" />
            </View>
            <View style={styles.profileInfo}>
              <TouchableOpacity onPress={handleEditName}>
                <Text style={styles.profileName}>{user.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEditEmail}>
                <Text style={styles.profileEmail}>{user.email}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.profileEdit} onPress={handleEditName}>
              <Icon name="edit" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileStats}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>{user.level}</Text>
              <Text style={styles.profileStatLabel}>Уровень</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>
                {Math.floor((new Date() - new Date(user.joinDate)) / (1000 * 60 * 60 * 24))}
              </Text>
              <Text style={styles.profileStatLabel}>Дней с нами</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>
                {user.level === 'A1' ? 'Новичок' :
                 user.level === 'A2' ? 'Начинающий' :
                 user.level === 'B1' ? 'Средний' :
                 user.level === 'B2' ? 'Выше среднего' :
                 user.level === 'C1' ? 'Продвинутый' : 'Эксперт'}
              </Text>
              <Text style={styles.profileStatLabel}>Статус</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
        <SectionHeader title="Основные" />
        <GlassCard style={styles.settingsCard}>
          <SettingItem icon="notifications" title="Уведомления" description="Напоминания о занятиях" type="toggle" value={settings.notifications} onToggle={() => handleToggle('notifications')} />
          <SettingItem icon="volume-up" title="Звуковые эффекты" description="Звуки при ответах" type="toggle" value={settings.soundEffects} onToggle={() => handleToggle('soundEffects')} />
          <SettingItem icon="play-circle" title="Автовоспроизведение" description="Автоматически проигрывать произношение" type="toggle" value={settings.autoPlay} onToggle={() => handleToggle('autoPlay')} />
        </GlassCard>
      </Animated.View>

      <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
        <SectionHeader title="Оформление" />
        <GlassCard style={styles.settingsCard}>
          <SettingItem icon="dark-mode" title="Тёмная тема" description={isDarkMode ? 'Включена' : 'Выключена'} type="toggle" value={isDarkMode} onToggle={toggleTheme} />
        </GlassCard>
      </Animated.View>

      <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
        <SectionHeader title="Обучение" />
        <GlassCard style={styles.settingsCard}>
          <SettingItem icon="calendar-today" title="Ежедневное напоминание" description="Время для занятий" type="toggle" value={settings.dailyReminder} onToggle={() => handleToggle('dailyReminder')} />
          {settings.dailyReminder && (
            <SettingItem icon="access-time" title="Время напоминания" value={settings.reminderTime} type="value" onPress={() => openModal('reminderTime', settings.reminderTime)} />
          )}
          <SettingItem icon="speed" title="Слов в день" description="Количество новых слов" value={`${settings.wordsPerDay} слов`} type="value" onPress={() => openModal('wordsPerDay', settings.wordsPerDay)} />
          <SettingItem icon="autorenew" title="Повторов в день" description="Слов для повторения" value={`${settings.reviewCount} слов`} type="value" onPress={() => openModal('reviewCount', settings.reviewCount)} />
          <SettingItem icon="language" title="Язык интерфейса" value={settings.language === 'ru' ? 'Русский' : 'English'} type="value" onPress={() => Alert.alert('Скоро', 'Другие языки появятся позже')} />
          <SettingItem icon="text-fields" title="Размер шрифта" value={settings.fontSize === 'small' ? 'Маленький' : settings.fontSize === 'medium' ? 'Средний' : 'Большой'} type="value" onPress={() => Alert.alert('Выберите размер', '', [
            { text: 'Маленький', onPress: () => handleChangeValue('fontSize', 'small') },
            { text: 'Средний', onPress: () => handleChangeValue('fontSize', 'medium') },
            { text: 'Большой', onPress: () => handleChangeValue('fontSize', 'large') },
            { text: 'Отмена', style: 'cancel' },
          ])} />
        </GlassCard>
      </Animated.View>

      <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
        <SectionHeader title="Данные" />
        <GlassCard style={styles.settingsCard}>
          <SettingItem icon="cloud-download" title="Экспорт данных" description="Сохранить прогресс" type="link" onPress={handleExportData} />
          <SettingItem icon="cloud-upload" title="Импорт данных" description="Восстановить прогресс" type="link" onPress={() => Alert.alert('Импорт данных', 'Функция в разработке')} />
          <SettingItem icon="delete-sweep" title="Очистить кэш" description="Освободить место (прогресс сохраняется)" type="link" onPress={handleClearCache} />
        </GlassCard>
      </Animated.View>

      <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
        <SectionHeader title="О приложении" />
        <GlassCard style={styles.settingsCard}>
          <SettingItem icon="info" title="Версия" value="1.0.0" type="value" />
          <SettingItem icon="feedback" title="Обратная связь" description="Сообщить о проблеме" type="link" onPress={handleFeedback} />
          <SettingItem icon="star" title="Оценить приложение" type="link" onPress={() => Alert.alert('Спасибо!', 'Ваша оценка важна для нас')} />
          <SettingItem icon="share" title="Рассказать друзьям" type="link" onPress={handleShare} />
          <SettingItem icon="description" title="Пользовательское соглашение" type="link" onPress={() => Alert.alert('Соглашение', 'Читайте на нашем сайте')} />
          <SettingItem icon="privacy-tip" title="Политика конфиденциальности" type="link" onPress={() => Alert.alert('Политика', 'Мы защищаем ваши данные')} />
        </GlassCard>
      </Animated.View>

      <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
        <SectionHeader title="Аккаунт" />
        <GlassCard style={styles.settingsCard}>
          <TouchableOpacity style={[styles.dangerButton, styles.logoutButton]} onPress={handleLogout}>
            <Icon name="exit-to-app" size={20} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>Выйти из аккаунта</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dangerButton, styles.deleteButton, { borderTopColor: colors.cardBorder }]} onPress={handleDeleteAccount}>
            <Icon name="delete-forever" size={20} color={colors.error} />
            <Text style={[styles.deleteText, { color: colors.error }]}>Удалить аккаунт</Text>
          </TouchableOpacity>
        </GlassCard>
      </Animated.View>

      <View style={styles.bottomPadding} />

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {modalType === 'reminderTime' && 'Время напоминания'}
                {modalType === 'wordsPerDay' && 'Слов в день'}
                {modalType === 'reviewCount' && 'Повторов в день'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder }]}
                value={tempValue}
                onChangeText={setTempValue}
                keyboardType={modalType === 'reminderTime' ? 'default' : 'numeric'}
                placeholder={
                  modalType === 'reminderTime' ? 'ЧЧ:ММ' :
                  modalType === 'wordsPerDay' ? '30' : '15'
                }
                maxLength={modalType === 'reminderTime' ? 5 : 3}
                placeholderTextColor={colors.textMuted}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.modalCancel]} onPress={() => setModalVisible(false)}>
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.modalSave]} onPress={handleModalSave}>
                  <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.modalSaveGradient}>
                    <Text style={styles.modalSaveText}>Сохранить</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: { margin: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  profileGradient: { padding: 20 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  profileAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  profileEmail: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  profileEdit: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  profileStats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  profileStat: { alignItems: 'center', flex: 1 },
  profileStatValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  profileStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  profileStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },
  settingsSection: { marginBottom: 16 },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },
  settingsCard: { marginHorizontal: 16, padding: 0, overflow: 'hidden', borderRadius: 16, borderWidth: 1 },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  settingIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '500' },
  settingDescription: { fontSize: 12, marginTop: 2 },
  settingAction: { marginLeft: 8 },
  settingValue: { flexDirection: 'row', alignItems: 'center' },
  settingValueText: { fontSize: 14, marginRight: 4 },
  dangerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 },
  logoutButton: { borderBottomWidth: 0 },
  deleteButton: { borderTopWidth: 1 },
  logoutText: { fontSize: 16, marginLeft: 8 },
  deleteText: { fontSize: 16, marginLeft: 8 },
  bottomPadding: { height: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden', borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { flex: 1, marginHorizontal: 4, borderRadius: 8, overflow: 'hidden' },
  modalCancel: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '500' },
  modalSave: { overflow: 'hidden' },
  modalSaveGradient: { padding: 14, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default SettingsScreen;