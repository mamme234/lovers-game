// Telegram WebApp Integration

export async function initTelegram() {
  return new Promise((resolve) => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.enableClosingConfirmation();
      
      // Set theme
      if (tg.themeParams) {
        const bgColor = tg.themeParams.bg_color;
        if (bgColor) {
          document.body.style.backgroundColor = bgColor;
        }
      }
      
      resolve(tg);
    } else {
      // Fallback for development
      resolve({
        initData: '',
        initDataUnsafe: {
          user: {
            id: 123456789,
            is_bot: false,
            first_name: 'Demo',
            last_name: 'User',
            username: 'demouser',
            language_code: 'en',
            is_premium: false,
            photo_url: 'https://via.placeholder.com/100'
          }
        },
        ready: () => {},
        expand: () => {},
        close: () => {},
        showAlert: (text) => alert(text),
        showConfirm: (text) => confirm(text)
      });
    }
  });
}

export function getTelegramUser() {
  const tg = window.Telegram?.WebApp;
  if (tg && tg.initDataUnsafe?.user) {
    return tg.initDataUnsafe.user;
  }
  return null;
}

export function getTelegramInitData() {
  const tg = window.Telegram?.WebApp;
  return tg?.initData || '';
}

export function closeTelegramApp() {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.close();
  }
}

export function showTelegramAlert(message) {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.showAlert(message);
  } else {
    alert(message);
  }
}

export function showTelegramConfirm(message) {
  return new Promise((resolve) => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.showConfirm(message, (confirmed) => {
        resolve(confirmed);
      });
    } else {
      resolve(confirm(message));
    }
  });
}
