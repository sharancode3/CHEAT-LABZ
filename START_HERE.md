# 🚀 Quick Start Guide

## Step 1: Install Dependencies

Open PowerShell in this folder and run:

```powershell
npm install
```

This will install all required packages (Express, JWT, bcrypt, etc.)

## Step 2: Start the Backend Server

After installation completes, start the server:

```powershell
npm start
```

You should see:
```
🎮 Game Portal Server running on http://localhost:3000
📊 Ready to track game progress and authenticate users
```

**Keep this terminal window open!** The server needs to stay running.

## Step 3: Open the Game Portal

### Option A: Using a Web Server (Recommended)

If you have VS Code with Live Server extension:
1. Right-click on `index.html`
2. Select "Open with Live Server"
3. Your browser will open automatically

### Option B: Direct File Opening

Simply double-click `index.html` to open it in your default browser.

**Note:** Some features work better with a proper web server (Option A).

## Step 4: Create Your Account

1. The app will redirect you to the login page
2. Click the "Sign Up" tab
3. Fill in:
   - Username: Choose any username
   - Email: your@email.com
   - Password: At least 6 characters
4. Click "Create Account"

You'll be automatically logged in and redirected to the game portal!

## Step 5: Start Playing!

- Browse the 6 available games
- Click "Play" on any game
- Your progress is automatically saved
- Use the search bar to filter games
- Click your username to see stats (coming soon)

---

## 🎮 Available Games

1. **Crazy Snake** - Classic arcade action
2. **Haunted Calculator** - Spooky puzzle challenge
3. **Ping Pong** - Beat the AI opponent
4. **Dino Run** - Endless runner fun
5. **Word Guesser** - Test your vocabulary
6. **Reaction Time** - Measure your reflexes

---

## ⚠️ Troubleshooting

### "Cannot find module" error
Run `npm install` again.

### Port 3000 already in use
Either:
- Close other apps using port 3000, or
- Edit `.env` file and change PORT to 3001

### Server won't start
Make sure you have Node.js installed:
```powershell
node --version
```
Should show v14 or higher.

### Games not saving progress
Make sure the backend server is running (Step 2).
Check the terminal for error messages.

---

## 🎯 Guest Mode

Don't want to create an account? Click "Continue as Guest" on the login page.

Note: Guest progress is saved locally but won't sync across devices.

---

## 📱 Tips

- Use **WASD** or **Arrow Keys** for most games
- Press **ESC** to close game modals
- Your best scores are tracked automatically
- Search for games by name or category
- Check the "About" page for more info

---

## 🛑 Stopping the Server

When you're done playing:
1. Go to the terminal where the server is running
2. Press `Ctrl + C`
3. Confirm with `Y` if prompted

---

**Enjoy gaming! 🎮**
