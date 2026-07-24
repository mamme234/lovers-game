import { AnimationManager } from '../animations.js';

const API_URL = 'http://localhost:5000/api';
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

    // Couple info
    if (couple) {
      document.getElementById('coupleNickname').textContent = 
        `${couple.nickname1 || 'You'} & ${couple.nickname2 || 'Your Love'}`;
      document.getElementById('relationshipStatus').textContent = 
        couple.isPaired ? '💕 Connected' : '⏳ Waiting for partner';
    } else {
      document.getElementById('relationshipStatus').textContent = '👥 Create a couple';
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
      }
    } catch (error) {
      console.error('Mood update error:', error);
    }
  });

  // Play game
  document.getElementById('playGameBtn')?.addEventListener('click', () => {
    document.querySelector('[data-page="games"]').click();
  });

  // Send message
  document.getElementById('sendMessageBtn')?.addEventListener('click', () => {
    document.querySelector('[data-page="chat"]').click();
  });

  // View rewards
  document.getElementById('viewRewardsBtn')?.addEventListener('click', () => {
    // Show rewards modal
  });
}
