import { AnimationManager } from '../animations.js';

const API_URL = 'https://lovers-game.onrender.com/api';
const APP_URL = 'https://lovers-game.vercel.app';
const animationManager = new AnimationManager();

export async function loadDashboard(user, couple, token) {
  try {
    // Fetch dashboard data
    const statsResponse = await fetch(`${API_URL}/user/statistics`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const statsData = await statsResponse.json();

    // Update dashboard UI
    const dashboard = document.getElementById('dashboard');
    
    // User stats
    if (statsData.stats) {
      document.getElementById('relationshipLevel').textContent = statsData.stats.level;
      document.getElementById('dailyStreak').textContent = statsData.stats.dailyStreak;
      document.getElementById('userCoins').textContent = statsData.stats.coins;
      document.getElementById('xpProgress').textContent = `${(statsData.stats.xp % 1000) / 10}%`;
    }

    // Update user avatar
    if (user?.photoUrl) {
      document.getElementById('user1Avatar').src = user.photoUrl;
      document.getElementById('profileAvatar').src = user.photoUrl;
    }

    // Update user name
    if (user) {
      document.getElementById('profileName').textContent = 
        `${user.firstName} ${user.lastName || ''}`;
      document.getElementById('profileLevel').textContent = `Level ${user.level || 1}`;
    }

    // Couple info
    if (couple) {
      document.getElementById('coupleNickname').textContent = 
        `${couple.nickname1 || 'You'} & ${couple.nickname2 || 'Your Love'}`;
      document.getElementById('relationshipStatus').textContent = 
        couple.user2 ? '💕 Connected' : '⏳ Waiting for partner';
      
      // Update partner avatar
      if (couple.user2?.photoUrl) {
        document.getElementById('user2Avatar').src = couple.user2.photoUrl;
      }
      
      // Hide connect couple button if already paired
      const connectWrapper = document.querySelector('.connect-couple-wrapper');
      if (connectWrapper) connectWrapper.classList.add('hidden');
    } else {
      document.getElementById('relationshipStatus').textContent = '👥 Not paired yet';
      // Show connect couple button if not paired
      const connectWrapper = document.querySelector('.connect-couple-wrapper');
      if (connectWrapper) connectWrapper.classList.remove('hidden');
      
      // Update invite link with user's username
      try {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser?.username) {
          const link = `${APP_URL}/?ref=@${tgUser.username}`;
          const display = document.getElementById('inviteLinkDisplay');
          const input = document.getElementById('inviteLinkInput');
          if (display) display.textContent = link;
          if (input) input.value = link;
        }
      } catch (e) {
        console.log('Telegram user not available');
      }
    }

    // Animate dashboard elements
    animationManager.animateSlideIn(document.querySelector('.couple-card'), 'down');
    animationManager.staggerElements(
      document.querySelectorAll('.stat-card'),
      0.3,
      0.1
    );

    // Setup event listeners
    setupDashboardListeners(user, couple, token);
    setupConnectCoupleListeners(token);
  } catch (error) {
    console.error('Dashboard load error:', error);
  }
}

function setupDashboardListeners(user, couple, token) {
  // Mood check-in
  document.getElementById('moodCheckInBtn')?.addEventListener('click', async () => {
    const moods = ['happy', 'sad', 'angry', 'confused', 'loved', 'grateful'];
    const mood = moods[Math.floor(Math.random() * moods.length)];
    
    try {
      const response = await fetch(`${API_URL}/user/mood`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ mood })
      });
      
      if (response.ok) {
        animationManager.animateHeartBeat(document.querySelector('.couple-card'));
        showToast(`😊 Mood updated to ${mood}!`, 'success');
      }
    } catch (error) {
      console.error('Mood update error:', error);
      showToast('❌ Failed to update mood', 'error');
    }
  });

  // Play game
  document.getElementById('playGameBtn')?.addEventListener('click', () => {
    const navItem = document.querySelector('[data-page="games"]');
    if (navItem) navItem.click();
  });

  // Send message
  document.getElementById('sendMessageBtn')?.addEventListener('click', () => {
    const navItem = document.querySelector('[data-page="chat"]');
    if (navItem) navItem.click();
  });

  // View rewards
  document.getElementById('viewRewardsBtn')?.addEventListener('click', () => {
    showToast('🎁 Rewards coming soon!', 'info');
  });
}

function setupConnectCoupleListeners(token) {
  // Connect Couple Button
  const connectBtn = document.getElementById('connectCoupleBtn');
  if (connectBtn) {
    connectBtn.addEventListener('click', () => {
      openConnectModal();
    });
  }

  // Copy Link Button
  const copyBtn = document.getElementById('copyLinkBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copyInviteLink();
    });
  }

  // Connect Form Submit
  const connectForm = document.getElementById('connectCoupleForm');
  if (connectForm) {
    connectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await sendInvite(token);
    });
  }

  // Close Modal
  const closeBtn = document.getElementById('closeModalBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeConnectModal();
    });
  }

  const cancelBtn = document.getElementById('cancelConnectBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      closeConnectModal();
    });
  }

  // Close modal on outside click
  const modal = document.getElementById('connectCoupleModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        closeConnectModal();
      }
    });
  }
}

function openConnectModal() {
  const modal = document.getElementById('connectCoupleModal');
  if (!modal) return;
  
  modal.classList.remove('hidden');
  
  // Update invite link with current user's username
  try {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (user?.username) {
      const link = `${APP_URL}/?ref=@${user.username}`;
      const input = document.getElementById('inviteLinkInput');
      const display = document.getElementById('inviteLinkDisplay');
      if (input) input.value = link;
      if (display) display.textContent = link;
    }
  } catch (e) {
    console.log('Telegram user not available');
  }
}

function closeConnectModal() {
  const modal = document.getElementById('connectCoupleModal');
  if (modal) modal.classList.add('hidden');
  const input = document.getElementById('usernameInput');
  if (input) input.value = '';
}

function copyInviteLink() {
  const input = document.getElementById('inviteLinkInput');
  if (!input) return;
  
  input.select();
  input.setSelectionRange(0, 99999);
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(input.value).then(() => {
      const btn = document.getElementById('copyLinkBtn');
      btn.textContent = '✅ Copied!';
      setTimeout(() => btn.textContent = '📋 Copy', 2000);
      showToast('📋 Link copied to clipboard!', 'success');
    }).catch(() => {
      document.execCommand('copy');
      const btn = document.getElementById('copyLinkBtn');
      btn.textContent = '✅ Copied!';
      setTimeout(() => btn.textContent = '📋 Copy', 2000);
      showToast('📋 Link copied to clipboard!', 'success');
    });
  } else {
    document.execCommand('copy');
    const btn = document.getElementById('copyLinkBtn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = '📋 Copy', 2000);
    showToast('📋 Link copied to clipboard!', 'success');
  }
}

async function sendInvite(token) {
  const usernameInput = document.getElementById('usernameInput');
  const username = usernameInput?.value.trim();
  
  if (!username) {
    showToast('❌ Please enter a username', 'error');
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
    const response = await fetch(`${API_URL}/couple/invite`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        username: username,
        inviteLink: `${APP_URL}/?ref=@${username}`
      })
    });

    const data = await response.json();

    if (overlay) overlay.classList.add('hidden');
    closeConnectModal();

    if (data.success) {
      showToast(`✅ Invite sent to @${username}!`, 'success');
      if (usernameInput) usernameInput.value = '';
    } else {
      showToast(`❌ ${data.error || 'Failed to send invite'}`, 'error');
    }
  } catch (error) {
    if (overlay) overlay.classList.add('hidden');
    showToast('❌ Failed to send invite. Please try again.', 'error');
    console.error('Invite error:', error);
  }
}

// Toast notification helper
function showToast(message, type = 'info') {
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
