const API_URL = 'http://localhost:5000/api';

export async function loadProfile(user, app) {
  try {
    // Display user info
    document.getElementById('profileName').textContent = 
      `${user.firstName} ${user.lastName}`;
    document.getElementById('profileLevel').textContent = 
      `Level ${user.level}`;
    document.getElementById('profileAvatar').src = user.photoUrl;

    // Fetch achievements
    const response = await fetch(`${API_URL}/user/achievements`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();

    // Display achievements
    if (data.achievements) {
      displayAchievements(data.achievements);
    }

    // Setup settings listeners
    setupProfileListeners(app, user);
  } catch (error) {
    console.error('Profile load error:', error);
  }
}

function displayAchievements(achievements) {
  const container = document.getElementById('achievementsList');
  if (!container) return;

  container.innerHTML = achievements
    .map(achievement => `
      <div class="achievement" title="${achievement.name}">
        ${achievement.icon || '🏆'}
      </div>
    `)
    .join('');
}

function setupProfileListeners(app, user) {
  // Preferences
  document.getElementById('notificationsToggle')?.addEventListener('change', (e) => {
    localStorage.setItem('notificationsEnabled', e.target.checked);
  });

  document.getElementById('soundToggle')?.addEventListener('change', (e) => {
    localStorage.setItem('soundEnabled', e.target.checked);
  });
}
