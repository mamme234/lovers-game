// telegram.js
// Telegram WebApp Integration

let telegramApp = null;

export async function initTelegram() {
  return new Promise((resolve) => {
    if (window.Telegram && window.Telegram.WebApp) {
      telegramApp = window.Telegram.WebApp;

      telegramApp.ready();
      telegramApp.expand();

      if (telegramApp.enableClosingConfirmation) {
        telegramApp.enableClosingConfirmation();
      }

      // Apply Telegram theme
      if (telegramApp.themeParams) {
        const theme = telegramApp.themeParams;

        if (theme.bg_color) {
          document.body.style.backgroundColor = theme.bg_color;
        }

        if (theme.text_color) {
          document.body.style.color = theme.text_color;
        }
      }

      resolve(telegramApp);
    } else {
      console.warn('Telegram WebApp not detected.');
      resolve(null);
    }
  });
}

export function getTelegramApp() {
  return telegramApp;
}

export function getTelegramUser() {
  if (!telegramApp) {
    telegramApp = window.Telegram?.WebApp;
  }

  if (!telegramApp) {
    return null;
  }

  if (
    !telegramApp.initDataUnsafe ||
    !telegramApp.initDataUnsafe.user
  ) {
    return null;
  }

  return telegramApp.initDataUnsafe.user;
}

export function getTelegramInitData() {
  if (!telegramApp) {
    telegramApp = window.Telegram?.WebApp;
  }

  return telegramApp?.initData || '';
}

export function getTelegramTheme() {
  if (!telegramApp) {
    telegramApp = window.Telegram?.WebApp;
  }

  return telegramApp?.themeParams || {};
}

export function showTelegramAlert(message) {
  if (!telegramApp) {
    telegramApp = window.Telegram?.WebApp;
  }

  if (telegramApp) {
    telegramApp.showAlert(message);
  } else {
    alert(message);
  }
}

export function showTelegramConfirm(message) {
  return new Promise((resolve) => {
    if (!telegramApp) {
      telegramApp = window.Telegram?.WebApp;
    }

    if (telegramApp) {
      telegramApp.showConfirm(message, resolve);
    } else {
      resolve(confirm(message));
    }
  });
}

export function hapticImpact(type = 'medium') {
  if (
    telegramApp &&
    telegramApp.HapticFeedback
  ) {
    telegramApp.HapticFeedback.impactOccurred(type);
  }
}

export function hapticNotification(type = 'success') {
  if (
    telegramApp &&
    telegramApp.HapticFeedback
  ) {
    telegramApp.HapticFeedback.notificationOccurred(type);
  }
}

export function closeTelegramApp() {
  if (!telegramApp) {
    telegramApp = window.Telegram?.WebApp;
  }

  telegramApp?.close();
      }
