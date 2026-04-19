// login.js - Authentication Logic
const API_URL = 'http://localhost:3000/api';

// Tab switching
const tabs = document.querySelectorAll('.tab');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const passwordToggles = document.querySelectorAll('.pass-toggle');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;
    
    // Update active tab
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Show corresponding form
    if (targetTab === 'login') {
      loginForm.classList.add('active');
      signupForm.classList.remove('active');
    } else {
      signupForm.classList.add('active');
      loginForm.classList.remove('active');
    }

    document.getElementById('loginError')?.classList.remove('show');
    document.getElementById('signupError')?.classList.remove('show');
  });
});

passwordToggles.forEach(toggle => {
  toggle.addEventListener('click', () => {
    const targetInput = document.getElementById(toggle.dataset.target);
    if (!targetInput) return;
    const isPassword = targetInput.type === 'password';
    targetInput.type = isPassword ? 'text' : 'password';
    toggle.textContent = isPassword ? 'Hide' : 'Show';
  });
});

// Login Form Handler
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Store token and user data
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      window.location.href = 'portal.html';
    } else {
      showError(errorEl, data.message || 'Login failed');
    }
  } catch (error) {
    showError(errorEl, 'Server connection failed. Trying offline mode...');
    // Fallback to local storage authentication for demo
    handleOfflineLogin(email, password, errorEl);
  }
});

// Signup Form Handler
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('signupUsername').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  const errorEl = document.getElementById('signupError');
  
  // Validation
  if (password !== confirm) {
    showError(errorEl, 'Passwords do not match');
    return;
  }
  
  if (password.length < 6) {
    showError(errorEl, 'Password must be at least 6 characters');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Store token and user data
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      window.location.href = 'portal.html';
    } else {
      showError(errorEl, data.message || 'Signup failed');
    }
  } catch (error) {
    showError(errorEl, 'Server connection failed. Trying offline mode...');
    // Fallback to local storage for demo
    handleOfflineSignup(username, email, password, errorEl);
  }
});

// Guest Login
document.getElementById('guestBtn').addEventListener('click', () => {
  const guestUser = {
    id: 'guest_' + Date.now(),
    username: 'Guest',
    email: 'guest@local',
    isGuest: true
  };
  
  localStorage.setItem('user', JSON.stringify(guestUser));
  localStorage.setItem('authToken', 'guest_token');
  window.location.href = 'portal.html';
});

// Offline fallback functions
function handleOfflineLogin(email, password, errorEl) {
  const users = JSON.parse(localStorage.getItem('offlineUsers') || '[]');
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    const userData = { ...user };
    delete userData.password;
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('authToken', 'offline_' + user.id);
    window.location.href = 'portal.html';
  } else {
    showError(errorEl, 'Invalid credentials (Offline mode)');
  }
}

function handleOfflineSignup(username, email, password, errorEl) {
  const users = JSON.parse(localStorage.getItem('offlineUsers') || '[]');
  
  // Check if user exists
  if (users.find(u => u.email === email)) {
    showError(errorEl, 'Email already registered (Offline mode)');
    return;
  }
  
  const newUser = {
    id: 'user_' + Date.now(),
    username,
    email,
    password, // In real app, this would be hashed
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  localStorage.setItem('offlineUsers', JSON.stringify(users));
  
  const userData = { ...newUser };
  delete userData.password;
  localStorage.setItem('user', JSON.stringify(userData));
  localStorage.setItem('authToken', 'offline_' + newUser.id);
  window.location.href = 'portal.html';
}

function showError(element, message) {
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 5000);
}

// Check if already logged in
if (localStorage.getItem('authToken')) {
  window.location.href = 'portal.html';
}
