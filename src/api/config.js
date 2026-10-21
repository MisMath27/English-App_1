import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Создаем экземпляр для запросов
const API = axios.create({
  // Вставь сюда URL своего сервера (если он есть)
  // Если сервера нет, оставь заглушку
  baseURL: 'https://your-backend-api.com/v1',
  timeout: 10000,
});

// Пример: перехватчик для добавления токена (если нужно)
API.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@user_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;