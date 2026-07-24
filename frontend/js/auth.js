import { getTelegramUser, getTelegramInitData, showTelegramAlert } from './telegram.js';

const API_URL = 'http://localhost:5000/api';

export async function initializeAuth(app) {
  try {
    const user = getTelegramUser();
    const initData = getTelegramInitData();

    if (!user) {
      showTelegramAlert('Could not retrieve Telegram user data');
      return;
    }

    // Show loading
    const loadingScreen = document.getElementById('loading');
    loadingScreen.classList.remove('hidden');

    // Login request
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        initData,
        userInfo: user
      })
    });

    const data = await response.json();

    if (data.success) {
      // Store token and user
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Reload user data
      await app.loadUserData(data.token);
      app.showMainApp();
    } else {
      showTelegramAlert('Login failed: ' + data.error);
    }
  } catch (error) {
    console.error('Auth error:', error);
    showTelegramAlert('Authentication error. Please try again.');
  } finally {
    document.getElementById('loading').classList.add('hidden');
  }
}

export function getToken() {
  return localStorage.getItem('token');
}

export function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function isAuthenticated() {
  return !!getToken();
}
