// server.js — Cheat Labz Static Server
require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3006;

app.use(express.static('.'));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
  console.log(`⚡ CHEAT LABZ server running → http://localhost:${PORT}`);
});
