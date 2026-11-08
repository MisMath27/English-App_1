import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';

export default function WelcomeScreen() {

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '891565206364-6tncrmbgur0qjfhgrvbf95pofekn1i3p.apps.googleusercontent.com', // Ваш Web Client ID
      offlineAccess: false,
    });
  }, []);

  // ВОТ ЭТА ФУНКЦИЯ БЫЛА УДАЛЕНА
  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const { idToken } = response.data || response;

      if (!idToken) {
        Alert.alert('Ошибка', 'Не удалось получить токен Google');
        return;
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);
      // После успешного входа App.js сам переключит экран
    } catch (error) {
      console.log('Google Sign-In Error:', error);
      Alert.alert('Ошибка входа', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#050505', '#0B1E2D']} style={styles.gradient}>

        {/* Контейнер для картинки */}
        <View style={styles.avatarContainer}>
          <Image
            source={require('../assets/portrait.png')}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.title}>SYSTEM READY</Text>
        <Text style={styles.subtitle}>
          Для доступа к приложению требуется авторизация.
        </Text>

        {/* Кнопка входа */}
        <TouchableOpacity style={styles.button} onPress={signInWithGoogle}>
          <LinearGradient colors={['#00FFCC', '#00B386']} style={styles.buttonGradient}>
            <Icon name="login" size={24} color="#000" />
            <Text style={styles.buttonText}>ИНИЦИАЛИЗИРОВАТЬ ВХОД</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Авторизуясь, вы сохраняете свой прогресс в облаке и получаете доступ к приложению.
        </Text>

      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },

  avatarContainer: {
    width: 300,
    height: 300,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00FFCC',
    marginBottom: 30,
    shadowColor: '#00FFCC',
    shadowRadius: 20,
    shadowOpacity: 0.8,
    elevation: 10,
  },
  avatarImage: { width: '100%', height: '100%' },

  title: { fontSize: 32, fontWeight: 'bold', color: '#00FFCC', fontFamily: 'monospace', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 50, lineHeight: 24 },

  button: { width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  buttonText: { color: '#000', fontSize: 16, fontWeight: 'bold', fontFamily: 'monospace' },

  footerText: { fontSize: 12, color: '#555', textAlign: 'center', marginTop: 20 },
});