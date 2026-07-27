import { initTelegram } from './telegram.js';
import { initializeSocket } from './socket.js';
import { initializeAuth } from './auth.js';
import { loadDashboard } from './pages/dashboard.js';
import { loadChat } from './pages/chat.js';
import { loadGames } from './pages/games.js';
import { loadMemories } from './pages/memories.js';
import { loadProfile } from './pages/profile.js';
import { AnimationManager } from './animations.js';

const API_URL = 'https://lovers-game.onrender.com/api';
const APP_URL = 'https://lovers-game.vercel.app';

class LoveVerseApp {
  constructor() {
    this.user = null;
    this.couple = null;
    this.socket = null;
    this.currentPage = 'dashboard';
    this.animationManager = new AnimationManager();
  }

  async init() {
    try {
      // Initialize Telegram WebApp
      await initTelegram();
      
      // Check authentication
      const token = localStorage.getItem('token');
      if (token) {
        await this.loadUserData(token);
        this.showMainApp();
      } else {
        this.showLoginScreen();
      }
      
      // Setup event listeners
      this.setupEventListeners();
      this.setupConnectCoupleListeners();
      
      // Hide loading screen
      document.getElementById('loading').classList.add('hidden');
    } catch (error) {
      console.error('Init error:', error);
    }
  }

  async loadUserData(token) {
    try {
      const response = await fetch(`${API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        this.user = data.user;
        console.log('✅ User loaded:', this.user);
        
        // Initialize socket
        this.socket = initializeSocket(token, this.user.id);
        this.setupSocketListeners();
        
        // Load couple data if paired
        if (this.user.coupleId) {
          await this.loadCoupleData();
          this.hideConnectCouple();
        } else {
          this.showConnectCouple();
        }
        
        // Update invite link with actual username
        this.updateInviteLink();
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      localStorage.removeItem('token');
    }
  }

  async loadCoupleData() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/couple/${this.user.coupleId}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        this.couple = data.couple;
      }
    } catch (error) {
      console.error('Failed to load couple data:', error);
    }
  }

  showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
  }

  showMainApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    this.navigateTo('dashboard');
  }

  showConnectCouple() {
    const wrapper = document.querySelector('.connect-couple-wrapper');
    if (wrapper) wrapper.classList.remove('hidden');
  }

  hideConnectCouple() {
    const wrapper = document.querySelector('.connect-couple-wrapper');
    if (wrapper) wrapper.classList.add('hidden');
  }

  updateInviteLink() {
    try {
      const username = this.user?.username || 
                       window.Telegram?.WebApp?.initDataUnsafe?.user?.username || 
                       this.user?.firstName || 
                       'friend';
      
      const link = `${APP_URL}/?ref=${username}`;
      
      const display = document.getElementById('inviteLinkDisplay');
      const input = document.getElementById('inviteLinkInput');
      
      if (display) {
        display.textContent = link;
        console.log('📋 Invite link updated:', link);
      }
      if (input) {
        input.value = link;
      }
    } catch (e) {
      console.log('Error updating invite link:', e);
    }
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        this.navigateTo(page);
      });
    });

    // Login button
    document.getElementById('telegramLoginBtn')?.addEventListener('click', () => {
      initializeAuth(this);
    });

    // Settings
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      this.navigateTo('profile');
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      this.logout();
    });

    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
      const isDarkMode = localStorage.getItem('darkMode') !== 'false';
      darkModeToggle.checked = isDarkMode;
      if (isDarkMode) document.body.classList.add('dark-mode');
      
      darkModeToggle.addEventListener('change', () => {
        const enabled = darkModeToggle.checked;
        localStorage.setItem('darkMode', enabled);
        document.body.classList.toggle('dark-mode', enabled);
      });
    }
  }

  setupConnectCoupleListeners() {
    // Connect Couple Button
    const connectBtn = document.getElementById('connectCoupleBtn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => {
        this.openConnectModal();
      });
    }

    // Copy Link Button
    const copyBtn = document.getElementById('copyLinkBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        this.copyInviteLink();
      });
    }

    // Connect Form Submit
    const connectForm = document.getElementById('connectCoupleForm');
    if (connectForm) {
      connectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendInvite();
      });
    }

    // Close Modal
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeConnectModal();
      });
    }

    const cancelBtn = document.getElementById('cancelConnectBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.closeConnectModal();
      });
    }

    // Close modal on outside click
    const modal = document.getElementById('connectCoupleModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
          this.closeConnectModal();
        }
      });
    }
  }

  openConnectModal() {
    const modal = document.getElementById('connectCoupleModal');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    
    // Update invite link with current user's username
    try {
      const username = this.user?.username || 
                       window.Telegram?.WebApp?.initDataUnsafe?.user?.username || 
                       this.user?.firstName || 
                       'friend';
      const link = `${APP_URL}/?ref=${username}`;
      
      const input = document.getElementById('inviteLinkInput');
      const display = document.getElementById('inviteLinkDisplay');
      if (input) {
        input.value = link;
        console.log('📋 Modal invite link updated:', link);
      }
      if (display) display.textContent = link;
    } catch (e) {
      console.log('Error updating modal invite link:', e);
    }
  }

  closeConnectModal() {
    const modal = document.getElementById('connectCoupleModal');
    if (modal) modal.classList.add('hidden');
    const input = document.getElementById('usernameInput');
    if (input) input.value = '';
  }

  copyInviteLink() {
    const input = document.getElementById('inviteLinkInput');
    if (!input) return;
    
    input.select();
    input.setSelectionRange(0, 99999);
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(input.value).then(() => {
        const btn = document.getElementById('copyLinkBtn');
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = '📋 Copy', 2000);
        this.showToast('📋 Link copied to clipboard!', 'success');
      }).catch(() => {
        document.execCommand('copy');
        const btn = document.getElementById('copyLinkBtn');
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = '📋 Copy', 2000);
        this.showToast('📋 Link copied to clipboard!', 'success');
      });
    } else {
      document.execCommand('copy');
      const btn = document.getElementById('copyLinkBtn');
      btn.textContent = '✅ Copied!';
      setTimeout(() => btn.textContent = '📋 Copy', 2000);
      this.showToast('📋 Link copied to clipboard!', 'success');
    }
  }

  async sendInvite() {
    const usernameInput = document.getElementById('usernameInput');
    const username = usernameInput?.value.trim();
    
    if (!username) {
      this.showToast('❌ Please enter a username', 'error');
      return;
    }

    // Show loading
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    if (overlay) {
      overlay.classList.remove('hidden');
      if (loadingText) loadingText.textContent = `Sending invite to @${username}...`;
    }

    try {
      const token = localStorage.getItem('token');
      const coupleId = this.user?.coupleId || this.couple?._id;
      
      if (!coupleId) {
        throw new Error('No couple found. Please create a couple first.');
      }
      
      const response = await fetch(`${API_URL}/couple/${coupleId}/invite`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          username: username
        })
      });

      const data = await response.json();

      if (overlay) overlay.classList.add('hidden');
      this.closeConnectModal();

      if (data.success) {
        this.showToast(`✅ ${data.message}`, 'success');
        if (usernameInput) usernameInput.value = '';
        
        // If deep link was generated, show it
        if (data.deepLink) {
          this.showToast(`🔗 Share this link: ${data.deepLink}`, 'info');
        }
      } else {
        this.showToast(`❌ ${data.error || 'Failed to send invite'}`, 'error');
      }
    } catch (error) {
      if (overlay) overlay.classList.add('hidden');
      this.showToast('❌ Failed to send invite. Please try again.', 'error');
      console.error('Invite error:', error);
    }
  }

  showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span>${message}</span>
        <button class="toast-close">×</button>
      </div>
    `;

    document.body.appendChild(toast);

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  navigateTo(page) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
    });

    // Show selected page
    const pageElement = document.getElementById(page);
    if (pageElement) {
      pageElement.classList.add('active');
      this.currentPage = page;
      this.loadPageContent(page);
    }
  }

  async loadPageContent(page) {
    const token = localStorage.getItem('token');
    
    switch(page) {
      case 'dashboard':
        await loadDashboard(this.user, this.couple, token);
        break;
      case 'chat':
        await loadChat(this.user, this.couple, token, this.socket);
        break;
      case 'games':
        await loadGames(this.user, this.couple, token, this.socket);
        break;
      case 'memories':
        await loadMemories(this.user, this.couple, token);
        break;
      case 'profile':
        await loadProfile(this.user, this);
        break;
    }
  }

  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('user_online', (data) => {
      this.updateOnlineStatus(true);
    });

    this.socket.on('user_offline', (data) => {
      this.updateOnlineStatus(false);
    });

    this.socket.on('new_message', (data) => {
      this.handleNewMessage(data);
    });

    this.socket.on('game_update', (data) => {
      this.handleGameUpdate(data);
    });

    this.socket.on('notification', (data) => {
      this.showNotification(data);
    });
  }

  updateOnlineStatus(isOnline) {
    const indicator = document.getElementById('onlineIndicator');
    const text = document.getElementById('onlineText');
    
    if (indicator) {
      indicator.style.background = isOnline ? '#00b894' : '#999';
      text.textContent = isOnline ? 'Online' : 'Offline';
    }
  }

  handleNewMessage(data) {
    if (this.currentPage === 'chat') {
      return;
    }
    this.showNotification({
      type: 'message',
      message: 'New message from your love 💕'
    });
  }

  handleGameUpdate(data) {
    if (this.currentPage === 'games') {
      return;
    }
  }

  showNotification(data) {
    const notification = document.createElement('div');
    notification.className = 'notification animate-slideInDown';
    notification.innerHTML = `
      <div class="notification-content">
        <span>${data.message}</span>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (this.socket) this.socket.disconnect();
    this.user = null;
    this.couple = null;
    this.showLoginScreen();
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new LoveVerseApp();
    app.init();
    window.loveVerseApp = app;
  });
} else {
  const app = new LoveVerseApp();
  app.init();
  window.loveVerseApp = app;
}

export { LoveVerseApp };
