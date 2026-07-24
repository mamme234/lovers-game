const API_URL = 'https://lovers-game.onrender.com/api';

export async function loadMemories(user, couple, token) {
  if (!couple) {
    document.getElementById('memories').innerHTML = '<p>No couple paired yet</p>';
    return;
  }

  try {
    // Fetch memories
    const response = await fetch(
      `${API_URL}/couple/${couple._id}/memories`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();

    // Display memories
    if (data.memories) {
      displayMemories(data.memories, couple._id, token);
    }

    // Setup upload button
    setupMemoryUpload(couple._id, token);
  } catch (error) {
    console.error('Memories load error:', error);
  }
}

function displayMemories(memories, coupleId, token) {
  const container = document.getElementById('memoriesGrid');
  container.innerHTML = memories
    .map(memory => `
      <div class="memory-item" data-id="${memory._id}">
        <img src="${memory.mediaUrl}" alt="Memory">
        <div class="memory-overlay">
          <button class="btn-icon" title="Add to favorites">⭐</button>
        </div>
      </div>
    `)
    .join('');

  // Add favorite toggle listeners
  container.querySelectorAll('.memory-item').forEach(item => {
    const overlay = item.querySelector('.memory-overlay');
    overlay?.addEventListener('click', async () => {
      const memoryId = item.dataset.id;
      try {
        await fetch(`${API_URL}/memories/${memoryId}/favorite`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Favorite toggle error:', error);
      }
    });
  });
}

function setupMemoryUpload(coupleId, token) {
  const uploadBtn = document.getElementById('uploadMemoryBtn');
  if (!uploadBtn) return;

  uploadBtn.addEventListener('click', async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Upload to Cloudinary or backend
      const formData = new FormData();
      formData.append('file', file);
      formData.append('coupleId', coupleId);

      try {
        const response = await fetch(`${API_URL}/couple/${coupleId}/memories`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (response.ok) {
          // Reload memories
          location.reload();
        }
      } catch (error) {
        console.error('Upload error:', error);
      }
    };
    input.click();
  });
}
