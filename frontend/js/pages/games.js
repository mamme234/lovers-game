const API_URL = 'http://localhost:5000/api';

export async function loadGames(user, couple, token, socket) {
  if (!couple) {
    document.getElementById('games').innerHTML = '<p>No couple paired yet</p>';
    return;
  }

  try {
    // Fetch game history
    const response = await fetch(
      `${API_URL}/couple/${couple._id}/games/history`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();

    // Display game history
    if (data.games) {
      displayGameHistory(data.games);
    }

    // Setup game cards
    setupGameCards(couple._id, user._id, token, socket);
  } catch (error) {
    console.error('Games load error:', error);
  }
}

function displayGameHistory(games) {
  const container = document.getElementById('gameHistoryList');
  if (!container) return;
  
  container.innerHTML = games
    .map(game => `
      <div class="history-item">
        <span>${game.gameType.replace(/_/g, ' ')}</span>
        <span>${game.winner ? '✓ Completed' : '⏳ Playing'}</span>
      </div>
    `)
    .join('');
}

function setupGameCards(coupleId, userId, token, socket) {
  document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', async () => {
      const gameType = card.dataset.game;
      
      try {
        const response = await fetch(
          `${API_URL}/couple/${coupleId}/games/start`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ gameType })
          }
        );

        const data = await response.json();
        if (data.game) {
          // Start game UI
          launchGame(data.game, gameType, socket);
        }
      } catch (error) {
        console.error('Game start error:', error);
      }
    });
  });
}

function launchGame(game, gameType, socket) {
  // Game launch logic here
  console.log('Game launched:', gameType, game);
  // Show game interface based on type
}
