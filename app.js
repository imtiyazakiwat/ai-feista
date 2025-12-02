// AI Fiesta - Multi-Model Chat Application
// Try local API first, fallback to direct API
const LOCAL_API_URL = '/api/chat';
const DIRECT_API_URL = 'https://unifiedapi.vercel.app/v1/chat/completions';
const API_KEY = 'sk-0000d80ad3c542d29120527e66963a2e';

// Detect if running locally with Vercel dev or directly
let useLocalApi = window.location.hostname === 'localhost' || window.location.protocol === 'http:';

async function callApi(model, messages, signal) {
  // Try local API first if available
  if (useLocalApi) {
    try {
      const response = await fetch(LOCAL_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true }),
        signal
      });
      if (response.ok) return response;
      // If local fails, try direct
      console.log('Local API failed, trying direct API...');
    } catch (e) {
      console.log('Local API not available, using direct API');
    }
  }
  
  // Use direct API
  return fetch(DIRECT_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, messages, stream: true }),
    signal
  });
}

// Models Configuration - Order: ChatGPT, Claude, Gemini, Grok, DeepSeek
const MODELS = {
  'chatgpt': {
    id: 'openrouter:openai/gpt-5.1',
    name: 'ChatGPT',
    icon: 'public/img/ChatGPT-Logo.png',
    color: '#10a37f',
    darkLogo: true  // Needs white background in dark theme
  },
  'claude': {
    id: 'openrouter:anthropic/claude-opus-4.5',
    name: 'Claude',
    icon: 'public/img/claude ai logo Background Removed.png',
    color: '#D97757',
    darkLogo: false
  },
  'gemini': {
    id: 'openrouter:google/gemini-3-pro-preview',
    name: 'Gemini',
    icon: 'public/img/gemini Background Removed.png',
    color: '#4285f4',
    darkLogo: false
  },
  'grok': {
    id: 'x-ai/grok-4.1-fast:free',
    name: 'Grok',
    icon: 'public/img/grok logo Background Removed.png',
    color: '#ffffff',
    darkLogo: true  // Needs white background in dark theme
  },
  'deepseek': {
    id: 'openrouter:deepseek/deepseek-v3.2',
    name: 'DeepSeek',
    icon: 'public/img/deepseek logo Background Removed.png',
    color: '#4D6BFE',
    darkLogo: false
  }
};

// App State
const state = {
  activeModels: ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek'],
  chats: [],
  currentChatId: null,
  isGenerating: false,
  theme: 'dark'
};

// Get current chat
function getCurrentChat() {
  return state.chats.find(c => c.id === state.currentChatId);
}

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('aiFiestaTheme') || 'dark';
  state.theme = savedTheme;
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeButton();
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('aiFiestaTheme', state.theme);
  updateThemeButton();
}

function updateThemeButton() {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    const icon = state.theme === 'dark' ? '☀️' : '🌙';
    const text = state.theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    btn.innerHTML = `<span>${icon}</span><span>${text}</span>`;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadState();
  renderModelTabs();
  renderChatColumns();
  renderChatHistory();
  setupEventListeners();
  
  // Load current chat if exists
  const chat = getCurrentChat();
  if (chat && chat.messages.length > 0) {
    hideWelcomeScreen();
    restoreChat(chat);
  }
});

function loadState() {
  const saved = localStorage.getItem('aiFiestaState');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.chats) state.chats = parsed.chats;
      if (parsed.currentChatId) state.currentChatId = parsed.currentChatId;
      if (parsed.activeModels) state.activeModels = parsed.activeModels;
    } catch (e) {}
  }
}

function saveState() {
  localStorage.setItem('aiFiestaState', JSON.stringify(state));
}

// Render Model Tabs
function renderModelTabs() {
  const container = document.getElementById('modelTabs');
  container.innerHTML = Object.entries(MODELS).map(([key, model]) => `
    <div class="model-tab ${state.activeModels.includes(key) ? 'active' : ''}" data-model="${key}">
      <img src="${model.icon}" alt="${model.name}" class="model-tab-icon ${model.darkLogo ? 'dark-logo' : ''}" onerror="this.style.display='none'">
      <span class="model-tab-name">${model.name}</span>
      <button class="tab-external-btn" title="Open in new tab">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
        </svg>
      </button>
      <div class="toggle-switch ${state.activeModels.includes(key) ? 'active' : ''}" data-model="${key}"></div>
    </div>
  `).join('');
}

// Render Chat Columns - with model name header
function renderChatColumns() {
  const container = document.getElementById('chatColumns');
  container.innerHTML = state.activeModels.map(modelKey => {
    const model = MODELS[modelKey];
    if (!model) return '';
    return `
      <div class="chat-column" data-model="${modelKey}">
        <div class="column-header">
          <img src="${model.icon}" alt="${model.name}" class="column-icon ${model.darkLogo ? 'dark-logo' : ''}" onerror="this.style.display='none'">
          <span class="column-name">${model.name}</span>
        </div>
        <div class="column-content" id="content-${modelKey}"></div>
      </div>
    `;
  }).join('');
  
  // Restore messages if chat exists
  const chat = getCurrentChat();
  if (chat && chat.messages.length > 0) {
    restoreChat(chat);
  }
}

// Render Chat History Sidebar
function renderChatHistory() {
  const container = document.getElementById('chatHistory');
  if (!container) return;
  
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;
  
  const todayChats = [];
  const yesterdayChats = [];
  const olderChats = [];
  
  state.chats.forEach(chat => {
    const chatDate = new Date(chat.createdAt).setHours(0, 0, 0, 0);
    if (chatDate === today) {
      todayChats.push(chat);
    } else if (chatDate === yesterday) {
      yesterdayChats.push(chat);
    } else {
      olderChats.push(chat);
    }
  });
  
  let html = '';
  
  if (todayChats.length > 0) {
    html += `<div class="history-section">
      <div class="history-title">Today</div>
      ${todayChats.map(chat => createChatHistoryItem(chat)).join('')}
    </div>`;
  }
  
  if (yesterdayChats.length > 0) {
    html += `<div class="history-section">
      <div class="history-title">Yesterday</div>
      ${yesterdayChats.map(chat => createChatHistoryItem(chat)).join('')}
    </div>`;
  }
  
  if (olderChats.length > 0) {
    html += `<div class="history-section">
      <div class="history-title">Previous</div>
      ${olderChats.map(chat => createChatHistoryItem(chat)).join('')}
    </div>`;
  }
  
  if (html === '') {
    html = '<div class="history-empty">No recent chats</div>';
  }
  
  container.innerHTML = html;
}

function createChatHistoryItem(chat) {
  const isActive = chat.id === state.currentChatId;
  const title = chat.title || 'New Chat';
  return `
    <div class="chat-item ${isActive ? 'active' : ''}" data-chat-id="${chat.id}">
      <span class="chat-item-title">${escapeHtml(title)}</span>
      <button class="chat-item-delete" title="Delete" onclick="event.stopPropagation(); deleteChat('${chat.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>
    </div>
  `;
}

// Event Listeners
function setupEventListeners() {
  // Model tab toggles
  document.getElementById('modelTabs').addEventListener('click', (e) => {
    const toggle = e.target.closest('.toggle-switch');
    if (toggle) {
      e.stopPropagation();
      toggleModel(toggle.dataset.model);
    }
  });

  // Chat history clicks
  document.getElementById('chatHistory')?.addEventListener('click', (e) => {
    const item = e.target.closest('.chat-item');
    if (item && !e.target.closest('.chat-item-delete')) {
      loadChat(item.dataset.chatId);
    }
  });

  // New chat
  document.getElementById('newChatBtn').addEventListener('click', createNewChat);
  
  // Theme toggle
  document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);

  // Message input
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (state.isGenerating) {
        stopGenerating();
      } else {
        sendMessage();
      }
    }
  });

  sendBtn.addEventListener('click', () => {
    if (state.isGenerating) {
      stopGenerating();
    } else {
      sendMessage();
    }
  });
}

function toggleModel(modelKey) {
  const index = state.activeModels.indexOf(modelKey);
  if (index > -1) {
    if (state.activeModels.length <= 1) {
      showToast('At least one model required');
      return;
    }
    state.activeModels.splice(index, 1);
  } else {
    state.activeModels.push(modelKey);
  }
  saveState();
  renderModelTabs();
  renderChatColumns(); // This will restore chat content
}

// Chat Management
function createNewChat() {
  const chat = {
    id: generateId(),
    title: null,
    messages: [],
    responses: {}, // Store responses per model
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.chats.unshift(chat);
  state.currentChatId = chat.id;
  saveState();
  renderChatHistory();
  clearAllColumns();
  showWelcomeScreen();
}

function loadChat(chatId) {
  state.currentChatId = chatId;
  saveState();
  renderChatHistory();
  
  const chat = getCurrentChat();
  if (chat) {
    hideWelcomeScreen();
    clearAllColumns();
    restoreChat(chat);
  }
}

function deleteChat(chatId) {
  state.chats = state.chats.filter(c => c.id !== chatId);
  if (state.currentChatId === chatId) {
    if (state.chats.length > 0) {
      state.currentChatId = state.chats[0].id;
      loadChat(state.currentChatId);
    } else {
      state.currentChatId = null;
      clearAllColumns();
      showWelcomeScreen();
    }
  }
  saveState();
  renderChatHistory();
}

function restoreChat(chat) {
  clearAllColumns();
  
  chat.messages.forEach((msg, msgIndex) => {
    if (msg.role === 'user') {
      // Render user message in all active columns
      state.activeModels.forEach(modelKey => {
        const container = document.getElementById(`content-${modelKey}`);
        if (!container) return;
        
        const model = MODELS[modelKey];
        const response = chat.responses[modelKey]?.[msgIndex];
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message';
        msgDiv.innerHTML = `
          <div class="message-user">
            <div class="user-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div class="user-message-content">${escapeHtml(msg.content)}</div>
            <button class="edit-btn" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
          ${response ? createResponseHTML(model, response) : ''}
        `;
        container.appendChild(msgDiv);
      });
    }
  });
  
  // Scroll to bottom
  state.activeModels.forEach(modelKey => {
    const container = document.getElementById(`content-${modelKey}`);
    if (container) container.scrollTop = container.scrollHeight;
  });
}

function createResponseHTML(model, response) {
  let thinkingHTML = '';
  if (response.thinking) {
    thinkingHTML = `
      <div class="thinking-section collapsed">
        <button class="thinking-toggle" onclick="toggleThinking(this)">
          <svg class="thinking-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
          <span>Thought for ${response.thinkingTime || 'a moment'}</span>
        </button>
        <div class="thinking-content">${renderMarkdown(response.thinking)}</div>
      </div>
    `;
  }
  
  return `
    <div class="message-assistant">
      <div class="assistant-response">
        <img src="${model.icon}" alt="${model.name}" class="assistant-icon ${model.darkLogo ? 'dark-logo' : ''}" onerror="this.style.display='none'">
        <div class="assistant-content-wrapper">
          ${thinkingHTML}
          <div class="assistant-content">${renderMarkdown(response.content || '')}</div>
        </div>
      </div>
    </div>
  `;
}

// Send Message
let abortControllers = [];

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  
  if (!message || state.activeModels.length === 0) return;

  input.value = '';
  hideWelcomeScreen();
  setGeneratingState(true);

  // Create chat if needed
  if (!state.currentChatId) {
    createNewChat();
  }
  
  const chat = getCurrentChat();
  if (!chat) return;
  
  // Get message index for storing responses
  const msgIndex = chat.messages.length;
  
  // Save user message
  chat.messages.push({ role: 'user', content: message });
  chat.updatedAt = Date.now();
  
  // Initialize responses for this message
  if (!chat.responses) chat.responses = {};
  
  saveState();

  // Render user message in all columns
  renderUserMessageInColumns(message, msgIndex);

  // Clear previous abort controllers
  abortControllers = [];

  // Send to all active models
  const promises = state.activeModels.map(modelKey => {
    const controller = new AbortController();
    abortControllers.push(controller);
    return sendToModel(modelKey, chat, msgIndex, controller.signal);
  });

  await Promise.allSettled(promises);
  setGeneratingState(false);
  
  // Generate chat title using Claude if not set
  if (!chat.title && chat.messages.length >= 1) {
    generateChatTitle(chat);
  }
}

// Check if message is a simple greeting
function isGreeting(message) {
  const greetings = ['hi', 'hello', 'hey', 'hola', 'howdy', 'greetings', 'good morning', 'good afternoon', 'good evening', 'whats up', "what's up", 'sup', 'yo', 'hii', 'hiii', 'heya', 'hiya'];
  const normalized = message.toLowerCase().trim().replace(/[!.,?]/g, '');
  return greetings.some(g => normalized === g || normalized.startsWith(g + ' '));
}

// Generate chat title using Claude
async function generateChatTitle(chat) {
  const userMessages = chat.messages.filter(m => m.role === 'user');
  
  if (userMessages.length === 0) return;
  
  const firstMessage = userMessages[0].content;
  const isFirstGreeting = isGreeting(firstMessage);
  
  // If first message is a greeting and we only have one message, set temporary title and wait
  if (isFirstGreeting && userMessages.length === 1) {
    if (!chat.title) {
      chat.title = 'New Conversation';
      saveState();
      renderChatHistory();
    }
    return; // Wait for second message to generate proper title
  }
  
  // If we already have a proper title (not temporary), skip
  if (chat.title && chat.title !== 'New Conversation') {
    return;
  }
  
  // Use second message if first is greeting, otherwise use first
  const messageForTitle = isFirstGreeting && userMessages.length >= 2 
    ? userMessages[1].content 
    : firstMessage;
  
  console.log('[Chat Title] Generating title for:', messageForTitle);
  
  try {
    const response = await fetch(DIRECT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4.5',
        messages: [{
          role: 'user',
          content: `Generate a very short chat title (2-5 words max) for this user message. Just respond with the title, nothing else. No quotes, no explanation.\n\nUser message: "${messageForTitle}"`
        }],
        stream: false
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const title = data.choices?.[0]?.message?.content?.trim();
      console.log('[Chat Title] Generated:', title);
      if (title && title.length <= 50) {
        chat.title = title;
        saveState();
        renderChatHistory();
      }
    } else {
      console.error('[Chat Title] API error:', response.status);
    }
  } catch (e) {
    console.error('[Chat Title] Failed to generate:', e);
    // Fallback to simple title
    chat.title = messageForTitle.substring(0, 40) + (messageForTitle.length > 40 ? '...' : '');
    saveState();
    renderChatHistory();
  }
}

function stopGenerating() {
  abortControllers.forEach(controller => controller.abort());
  setGeneratingState(false);
}

function setGeneratingState(isGenerating) {
  state.isGenerating = isGenerating;
  const sendBtn = document.getElementById('sendBtn');
  
  if (isGenerating) {
    sendBtn.classList.add('generating');
    sendBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2"/>
      </svg>
    `;
    sendBtn.title = 'Stop generating';
  } else {
    sendBtn.classList.remove('generating');
    sendBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
      </svg>
    `;
    sendBtn.title = 'Send message';
  }
}

function renderUserMessageInColumns(message, msgIndex) {
  state.activeModels.forEach(modelKey => {
    const model = MODELS[modelKey];
    if (!model) return;
    
    const container = document.getElementById(`content-${modelKey}`);
    if (!container) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    msgDiv.id = `msg-${modelKey}-${msgIndex}`;
    msgDiv.innerHTML = `
      <div class="message-user">
        <div class="user-avatar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <div class="user-message-content">${escapeHtml(message)}</div>
        <button class="edit-btn" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>
      <div class="message-assistant" id="response-${modelKey}-${msgIndex}">
        <div class="assistant-response">
          <img src="${model.icon}" alt="${model.name}" class="assistant-icon ${model.darkLogo ? 'dark-logo' : ''}" onerror="this.style.display='none'">
          <div class="assistant-content-wrapper">
            <div class="generating-placeholder">
              <div class="placeholder-line"></div>
              <div class="placeholder-line"></div>
              <div class="placeholder-line short"></div>
            </div>
            <div class="generating-status">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
              <span>Generating response...</span>
            </div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  });
}

async function sendToModel(modelKey, chat, msgIndex, signal) {
  const model = MODELS[modelKey];
  const responseContainer = document.getElementById(`response-${modelKey}-${msgIndex}`);
  
  if (!responseContainer) return;

  // Build conversation history for this model
  const conversationHistory = [];
  
  // Add system prompt for Claude to enable thinking (DeepSeek v3.2 doesn't support this)
  if (modelKey === 'claude') {
    conversationHistory.push({
      role: 'system',
      content: 'Think step by step inside <think></think> tags, then provide your final answer outside the tags.'
    });
  }
  
  chat.messages.forEach((msg, idx) => {
    if (msg.role === 'user') {
      conversationHistory.push({ role: 'user', content: msg.content });
      // Add assistant response if exists
      const resp = chat.responses[modelKey]?.[idx];
      if (resp?.content) {
        conversationHistory.push({ role: 'assistant', content: resp.content });
      }
    }
  });

  const thinkingStartTime = Date.now();
  let thinkingContent = '';
  let responseContent = '';
  let rawContent = ''; // For DeepSeek think tag parsing
  let isThinking = true;

  try {
    console.log(`[${model.name}] Sending request...`);
    const response = await callApi(model.id, conversationHistory, signal);
    console.log(`[${model.name}] Response status:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${model.name}] API Error:`, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // Update to show thinking state
    responseContainer.innerHTML = `
      <div class="assistant-response">
        <img src="${model.icon}" alt="${model.name}" class="assistant-icon ${model.darkLogo ? 'dark-logo' : ''}" onerror="this.style.display='none'">
        <div class="assistant-content-wrapper">
          <div class="thinking-section active" id="thinking-${modelKey}-${msgIndex}">
            <div class="thinking-header">
              <svg class="thinking-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <span>Thinking...</span>
            </div>
            <div class="thinking-content"></div>
          </div>
          <div class="assistant-content" id="content-${modelKey}-${msgIndex}" style="display: none;"></div>
          <div class="generating-status" id="status-${modelKey}-${msgIndex}">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
            <span>Generating response...</span>
          </div>
        </div>
      </div>
    `;
    
    const thinkingSection = document.getElementById(`thinking-${modelKey}-${msgIndex}`);
    const thinkingContentDiv = thinkingSection?.querySelector('.thinking-content');
    const contentDiv = document.getElementById(`content-${modelKey}-${msgIndex}`);
    const statusDiv = document.getElementById(`status-${modelKey}-${msgIndex}`);

    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
          try {
            const jsonStr = trimmedLine.slice(6);
            const data = JSON.parse(jsonStr);
            const delta = data.choices?.[0]?.delta;
            
            // Handle thinking/reasoning content (from reasoning_content field)
            if (delta?.reasoning_content) {
              thinkingContent += delta.reasoning_content;
              if (thinkingContentDiv) {
                thinkingContentDiv.innerHTML = renderMarkdown(thinkingContent);
              }
            }
            
            // Handle actual response content
            if (delta?.content) {
              // For Claude, parse <think></think> tags from content
              if (modelKey === 'claude') {
                rawContent += delta.content;
                
                // Check if we're inside think tags (not yet closed)
                if (rawContent.includes('<think>') && !rawContent.includes('</think>')) {
                  // Still thinking - extract and show thinking content
                  const thinkStart = rawContent.indexOf('<think>') + 7;
                  thinkingContent = rawContent.substring(thinkStart);
                  if (thinkingContentDiv) {
                    thinkingContentDiv.innerHTML = renderMarkdown(thinkingContent);
                  }
                  const columnContent = document.getElementById(`content-${modelKey}`);
                  if (columnContent) {
                    columnContent.scrollTop = columnContent.scrollHeight;
                  }
                  continue;
                } else if (rawContent.includes('</think>')) {
                  // Thinking done - extract final thinking and response
                  const thinkStart = rawContent.indexOf('<think>') + 7;
                  const thinkEnd = rawContent.indexOf('</think>');
                  thinkingContent = rawContent.substring(thinkStart, thinkEnd).trim();
                  responseContent = rawContent.substring(thinkEnd + 8).trim();
                  
                  // Transition to response mode (only once)
                  if (isThinking) {
                    isThinking = false;
                    const thinkingTime = Math.round((Date.now() - thinkingStartTime) / 1000);
                    
                    if (thinkingSection && thinkingContent) {
                      thinkingSection.classList.remove('active');
                      thinkingSection.classList.add('collapsed');
                      thinkingSection.innerHTML = `
                        <button class="thinking-toggle" onclick="toggleThinking(this)">
                          <svg class="thinking-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                          <span>Thought for ${thinkingTime}s</span>
                        </button>
                        <div class="thinking-content">${renderMarkdown(thinkingContent)}</div>
                      `;
                    } else if (thinkingSection) {
                      thinkingSection.style.display = 'none';
                    }
                  }
                  
                  // Update response content
                  if (contentDiv && responseContent) {
                    contentDiv.style.display = 'block';
                    contentDiv.innerHTML = renderMarkdown(responseContent);
                  }
                  
                  const columnContent = document.getElementById(`content-${modelKey}`);
                  if (columnContent) {
                    columnContent.scrollTop = columnContent.scrollHeight;
                  }
                  continue;
                }
                // No think tags yet, just accumulate
                continue;
              }
              
              // For non-DeepSeek models
              if (isThinking && thinkingContent) {
                // Transition from thinking to response
                isThinking = false;
                const thinkingTime = Math.round((Date.now() - thinkingStartTime) / 1000);
                
                if (thinkingSection) {
                  thinkingSection.classList.remove('active');
                  thinkingSection.classList.add('collapsed');
                  thinkingSection.innerHTML = `
                    <button class="thinking-toggle" onclick="toggleThinking(this)">
                      <svg class="thinking-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                      <span>Thought for ${thinkingTime}s</span>
                    </button>
                    <div class="thinking-content">${renderMarkdown(thinkingContent)}</div>
                  `;
                }
              } else if (isThinking && !thinkingContent) {
                // No thinking content, hide thinking section
                isThinking = false;
                if (thinkingSection) {
                  thinkingSection.style.display = 'none';
                }
              }
              
              responseContent += delta.content;
              if (contentDiv) {
                contentDiv.style.display = 'block';
                contentDiv.innerHTML = renderMarkdown(responseContent);
              }
              
              const columnContent = document.getElementById(`content-${modelKey}`);
              if (columnContent) {
                columnContent.scrollTop = columnContent.scrollHeight;
              }
            }
          } catch (e) {}
        }
      }
    }

    // Finalize
    if (statusDiv) statusDiv.remove();
    
    // If no thinking happened, hide thinking section
    if (!thinkingContent && thinkingSection) {
      thinkingSection.style.display = 'none';
    }
    
    // If still in thinking mode but got content
    if (isThinking && responseContent && thinkingSection) {
      thinkingSection.style.display = 'none';
    }
    
    // Store response
    if (!chat.responses[modelKey]) chat.responses[modelKey] = {};
    chat.responses[modelKey][msgIndex] = {
      content: responseContent,
      thinking: thinkingContent || null,
      thinkingTime: thinkingContent ? `${Math.round((Date.now() - thinkingStartTime) / 1000)}s` : null
    };
    saveState();

  } catch (error) {
    if (error.name === 'AbortError') {
      const statusDiv = document.getElementById(`status-${modelKey}-${msgIndex}`);
      if (statusDiv) {
        statusDiv.innerHTML = '<span>Generation stopped</span>';
        statusDiv.classList.add('stopped');
      }
      return;
    }
    
    console.error(`Error with ${modelKey}:`, error);
    responseContainer.innerHTML = `
      <div class="assistant-response">
        <img src="${model.icon}" alt="${model.name}" class="assistant-icon ${model.darkLogo ? 'dark-logo' : ''}" onerror="this.style.display='none'">
        <div class="assistant-content-wrapper">
          <div class="assistant-content error">Error: ${error.message}</div>
        </div>
      </div>
    `;
  }
}

// Toggle thinking section
function toggleThinking(btn) {
  const section = btn.closest('.thinking-section');
  if (section) {
    section.classList.toggle('collapsed');
    section.classList.toggle('expanded');
  }
}

// UI Helpers
function showWelcomeScreen() {
  document.getElementById('welcomeScreen').classList.remove('hidden');
}

function hideWelcomeScreen() {
  document.getElementById('welcomeScreen').classList.add('hidden');
}

function clearAllColumns() {
  state.activeModels.forEach(modelKey => {
    const container = document.getElementById(`content-${modelKey}`);
    if (container) container.innerHTML = '';
  });
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Utilities
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMarkdown(text) {
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      highlight: function(code, lang) {
        if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return code;
      },
      breaks: true,
      gfm: true
    });
    return marked.parse(text);
  }
  return escapeHtml(text).replace(/\n/g, '<br>');
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    createNewChat();
  }
  if (e.key === '/' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    document.getElementById('messageInput').focus();
  }
});

// Make functions globally available
window.toggleThinking = toggleThinking;
window.deleteChat = deleteChat;
