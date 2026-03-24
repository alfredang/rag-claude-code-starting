// API base URL - use relative path to work from any host
const API_URL = '/api';

// Global state
let currentSessionId = null;

// DOM elements
let chatMessages, chatInput, sendButton, clearButton, totalCourses, courseTitles, newChatBtn, balloonsBtn;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    chatMessages = document.getElementById('chatMessages');
    chatInput = document.getElementById('chatInput');
    sendButton = document.getElementById('sendButton');
    totalCourses = document.getElementById('totalCourses');
    courseTitles = document.getElementById('courseTitles');
    newChatBtn = document.getElementById('newChatBtn');
    clearButton = document.getElementById('clearButton');
    balloonsBtn = document.getElementById('balloonsBtn');

    setupEventListeners();
    initThemeToggle();
    createNewSession();
    loadCourseStats();
});

// Event Listeners
function setupEventListeners() {
    newChatBtn.addEventListener('click', handleNewChat);
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Clear messages button
    clearButton.addEventListener('click', clearMessages);

    // Balloons button
    balloonsBtn.addEventListener('click', launchBalloons);

    document.querySelectorAll('.suggested-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const question = e.target.closest('.suggested-item').getAttribute('data-question');
            chatInput.value = question;
            sendMessage();
        });
    });
}

// Chat Functions
async function sendMessage() {
    const query = chatInput.value.trim();
    if (!query) return;

    chatInput.value = '';
    chatInput.disabled = true;
    sendButton.disabled = true;

    addMessage(query, 'user');

    const loadingMessage = createLoadingMessage();
    chatMessages.appendChild(loadingMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch(`${API_URL}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: query,
                session_id: currentSessionId
            })
        });

        if (!response.ok) throw new Error('Query failed');

        const data = await response.json();

        if (!currentSessionId) {
            currentSessionId = data.session_id;
        }

        loadingMessage.remove();
        addMessage(data.answer, 'assistant', data.sources);

    } catch (error) {
        loadingMessage.remove();
        addMessage(`Error: ${error.message}`, 'assistant');
    } finally {
        chatInput.disabled = false;
        sendButton.disabled = false;
        chatInput.focus();
    }
}

function createLoadingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="thinking-indicator">
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <div class="shimmer-bar"></div>
            </div>
        </div>
    `;
    return messageDiv;
}

function addMessage(content, type, sources = null, isWelcome = false) {
    const messageId = Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}${isWelcome ? ' welcome-message' : ''}`;
    messageDiv.id = `message-${messageId}`;

    const displayContent = type === 'assistant' ? marked.parse(content) : escapeHtml(content);

    let html = `<div class="message-content">${displayContent}</div>`;

    if (sources && sources.length > 0) {
        html += `
            <details class="sources-collapsible">
                <summary>Sources (${sources.length})</summary>
                <div class="sources-content">${sources.map(s => `<div class="source-item">${escapeHtml(s)}</div>`).join('')}</div>
            </details>
        `;
    }

    messageDiv.innerHTML = html;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageId;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function handleNewChat() {
    // Add button press animation
    newChatBtn.style.transform = 'scale(0.95)';
    setTimeout(() => { newChatBtn.style.transform = ''; }, 150);

    try {
        if (currentSessionId) {
            await fetch(`${API_URL}/new-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: currentSessionId })
            });
        }
    } catch (error) {
        console.error('Error clearing session:', error);
    }
    createNewSession();
    chatInput.focus();
}

async function createNewSession() {
    currentSessionId = null;
    chatMessages.innerHTML = '';
    addMessage(
        'Welcome to the **Course Materials Assistant**! I can help you explore courses, dive into specific lessons, and find the content you need. What would you like to know?',
        'assistant',
        null,
        true
    );
}

// Load course statistics
async function loadCourseStats() {
    try {
        const response = await fetch(`${API_URL}/courses`);
        if (!response.ok) throw new Error('Failed to load course stats');

        const data = await response.json();

        if (totalCourses) {
            totalCourses.textContent = data.total_courses;
        }

        if (courseTitles) {
            if (data.course_titles && data.course_titles.length > 0) {
                courseTitles.innerHTML = data.course_titles
                    .map(title => `<button class="course-title-btn" data-course="${escapeHtml(title)}">${escapeHtml(title)}</button>`)
                    .join('');
                document.querySelectorAll('.course-title-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        chatInput.value = `What are the topics covered in "${btn.dataset.course}"?`;
                        sendMessage();
                    });
                });
            } else {
                courseTitles.innerHTML = '<span class="no-courses">No courses available</span>';
            }
        }

    } catch (error) {
        console.error('Error loading course stats:', error);
        if (totalCourses) {
            totalCourses.textContent = '0';
        }
        if (courseTitles) {
            courseTitles.innerHTML = '<span class="error">Failed to load courses</span>';
        }
    }
}

// Theme Toggle
function initThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    const label = document.getElementById('themeLabel');
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    label.textContent = isLight ? 'Light Mode' : 'Dark Mode';
    toggle.setAttribute('aria-checked', isLight ? 'true' : 'false');

    toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        if (current === 'light') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
            label.textContent = 'Dark Mode';
            toggle.setAttribute('aria-checked', 'false');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            label.textContent = 'Light Mode';
            toggle.setAttribute('aria-checked', 'true');
        }
    });
}

// Clear Input Text
function clearMessages() {
    chatInput.value = '';
    chatInput.focus();
}

// Balloon Animation
function launchBalloons() {
    const colors = ['#c9a84c', '#e4c767', '#8a7233', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];
    const count = 15;

    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const balloon = document.createElement('div');
            balloon.className = 'balloon';
            balloon.style.left = Math.random() * 100 + 'vw';
            balloon.style.background = colors[Math.floor(Math.random() * colors.length)];
            balloon.style.setProperty('--duration', (2 + Math.random() * 2) + 's');
            balloon.style.width = (30 + Math.random() * 25) + 'px';
            balloon.style.height = (38 + Math.random() * 30) + 'px';
            document.body.appendChild(balloon);

            balloon.addEventListener('animationend', () => balloon.remove());
        }, i * 120);
    }
}
