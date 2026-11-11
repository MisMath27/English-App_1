import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

const TERMS_TEXT = `
1. Общие положения
Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует отношения между Администрацией приложения EnglishApp (далее — «Администрация») и любым лицом, использующим приложение EnglishApp (далее — «Пользователь»).

Использование приложения означает полное и безоговорочное согласие Пользователя с условиями настоящего Соглашения.

2. Предмет соглашения
Администрация предоставляет Пользователю доступ к функционалу приложения для изучения английского языка, включая словарные карточки, грамматические задания, статистику и граф знаний.

3. Права и обязанности Пользователя
3.1. Пользователь обязуется использовать приложение только в законных целях.
3.2. Пользователь несет ответственность за сохранность своих учетных данных.
3.3. Запрещается копировать, распространять или модифицировать контент приложения без разрешения Администрации.

4. Ограничение ответственности
Приложение предоставляется «как есть». Администрация не гарантирует абсолютную точность переводов или заданий и не несет ответственности за возможные ошибки в обучении.

5. Заключительные положения
Администрация оставляет за собой право изменять условия Соглашения в любое время без предварительного уведомления. Актуальная версия всегда доступна в приложении.

По всем вопросам: SupportEnglishApp@gmail.com
`;

const PRIVACY_TEXT = `
1. Общие сведения
Настоящая Политика конфиденциальности описывает, как приложение EnglishApp собирает, использует и защищает информацию Пользователя.

2. Какие данные мы собираем
2.1. Данные аккаунта: адрес электронной почты и имя (при входе через Google).
2.2. Прогресс обучения: выученные слова, статистика повторений, достижения.
2.3. Данные об устройстве: техническая информация для обеспечения стабильной работы приложения.

3. Как мы используем данные
3.1. Для сохранения вашего прогресса и синхронизации между устройствами.
3.2. Для формирования персональной статистики обучения.
3.3. Мы не передаем ваши личные данные третьим лицам в маркетинговых целях.

4. Хранение и защита
Ваши данные хранятся локально на устройстве и (при авторизации) в защищенном облачном хранилище Firebase. Мы используем современные методы шифрования для защиты информации.

5. Ваши права
Вы можете в любой момент удалить свой аккаунт и все связанные с ним данные через раздел «Настройки» в приложении.

6. Контакты
По вопросам конфиденциальности: SupportEnglishApp@gmail.com
`;

export default function LegalScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { type } = route.params; // 'terms' или 'privacy'

  const isTerms = type === 'terms';
  const title = isTerms ? 'Пользовательское соглашение' : 'Политика конфиденциальности';
  const text = isTerms ? TERMS_TEXT : PRIVACY_TEXT;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {text}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  content: { padding: 20, paddingBottom: 40 },
  text: { fontSize: 15, lineHeight: 24 },
});