import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { colors } = useTheme();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '891565206364-6tncrmbgur0qjfhgrvbf95pofekn1i3p.apps.googleusercontent.com', // Ваш Web Client ID
      offlineAccess: false,
    });
  }, []);

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

        <View style={styles.iconContainer}>
          <Icon name="terminal" size={80} color="#00FFCC" />
        </View>

        <Text style={styles.title}>SYSTEM READY</Text>
        <Text style={styles.subtitle}>
          Для доступа к базе данных английского языка требуется авторизация.
        </Text>

        <TouchableOpacity style={styles.button} onPress={signInWithGoogle}>
          <LinearGradient colors={['#00FFCC', '#00B386']} style={styles.buttonGradient}>
            <Icon name="login" size={24} color="#000" />
            <Text style={styles.buttonText}>ИНИЦИАЛИЗИРОВАТЬ ВХОД</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Авторизуясь, вы сохраняете свой прогресс в облаке и получаете доступ к глобальной карте.
        </Text>

      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  iconContainer: { marginBottom: 30, shadowColor: '#00FFCC', shadowRadius: 20, shadowOpacity: 0.8 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#00FFCC', fontFamily: 'monospace', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 50, lineHeight: 24 },
  button: { width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  buttonText: { color: '#000', fontSize: 16, fontWeight: 'bold', fontFamily: 'monospace' },
  footerText: { fontSize: 12, color: '#555', textAlign: 'center', marginTop: 20 },
});