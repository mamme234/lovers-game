import { emitMessage, emitTyping } from '../socket.js';

const API_URL = 'http://localhost:5000/api';

export async function loadChat(user, couple, token, socket) {
  if (!couple) {
    document.getElementById('chat').innerHTML = '<p>No couple paired yet</p>';
    return;
  }

  try {
    // Fetch messages
    const response = await fetch(
      `${API_URL}/couple/${couple._id}/messages?limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();

    // Display messages
    if (data.messages) {
      displayMessages(data.messages, user._id);
    }

    // Setup event listeners
    setupChatListeners(couple._id, user._id, token, socket);
  } catch (error) {
    console.error('Chat load error:', error);
  }
}

function displayMessages(messages, userId) {
  const container = document.getElementById('messagesContainer');
  container.innerHTML = '';

  messages.forEach(msg => {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${msg.senderId === userId ? 'sent' : 'received'}`;
    messageEl.innerHTML = `
      <div class="message-bubble">${msg.content}</div>
    `;
    container.appendChild(messageEl);
  });

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function setupChatListeners(coupleId, userId, token, socket) {
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendMessageIconBtn');

  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      const content = input.value.trim();
      if (!content) return;

      try {
        const response = await fetch(`${API_URL}/couple/${coupleId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            content,
            messageType: 'text'
          })
        });

        if (response.ok) {
          input.value = '';
          emitMessage(socket, coupleId, content, 'text');
        }
      } catch (error) {
        console.error('Message send error:', error);
      }
    });
  }

  // Typing indicator
  if (input) {
    let typingTimeout;
    input.addEventListener('input', () => {
      emitTyping(socket, coupleId, true);
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        emitTyping(socket, coupleId, false);
      }, 2000);
    });
  }

  // Socket listeners
  if (socket) {
    socket.on('new_message', (msg) => {
      const container = document.getElementById('messagesContainer');
      const messageEl = document.createElement('div');
      messageEl.className = `message ${msg.senderId === userId ? 'sent' : 'received'}`;
      messageEl.innerHTML = `<div class="message-bubble">${msg.content}</div>`;
      container.appendChild(messageEl);
      container.scrollTop = container.scrollHeight;
    });
  }
}
