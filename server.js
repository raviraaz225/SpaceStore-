const fs = require("fs");
const express = require('express');
const path = require('path');
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '15mb' }));

const OWNER_KEY = process.env.OWNER_KEY || 'spacestore-owner-123';
let posters = [
  { id: 1, title: 'SpaceStore', subtitle: 'Featured Event', mediaUrl: '', url: '' }
];
let notifications = [
  { id: 1, text: 'SpaceStore ready hai! Naye apps, games aur event updates yahan dikhenge.', time: new Date().toLocaleTimeString() }
];
let items = [
  { id: 1, title: 'Space Runner', subtitle: 'Game', url: 'https://poki.com', icon: '🚀', category: 'game', code: 'SS-FAL303', views: 150, status: 'live' },
  { id: 2, title: 'Meteor Dodge', subtitle: 'Game', url: 'https://poki.com', icon: '☄️', category: 'game', code: 'SS-MET404', views: 88, status: 'live' },
  { id: 3, title: 'Orbit Hop', subtitle: 'Game', url: 'https://poki.com', icon: '🛸', category: 'game', code: 'SS-ORB505', views: 112, status: 'live' },
  { id: 4, title: 'Mars Drop', subtitle: 'Game', url: 'https://poki.com', icon: '🔴', category: 'game', code: 'SS-MAR606', views: 73, status: 'live' },
  { id: 5, title: 'Wikipedia Web', subtitle: 'App', url: 'https://en.m.wikipedia.org', icon: '📚', category: 'app', code: 'SS-WIKI1', views: 45, status: 'live' },
  { id: 6, title: 'MDN Web Docs', subtitle: 'App', url: 'https://developer.mozilla.org', icon: '💻', category: 'app', code: 'SS-MDN2', views: 32, status: 'live' }
];


const DATA_FILE = path.join(__dirname, "data.json");
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      if (Array.isArray(parsed.posters)) posters = parsed.posters;
      if (Array.isArray(parsed.notifications)) notifications = parsed.notifications;
      if (Array.isArray(parsed.items)) items = parsed.items;
    }
  } catch (e) {
    console.error("Error reading data.json:", e.message);
  }
}
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ posters, notifications, items }, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving data.json:", e.message);
  }
}
loadData();

function addNotif(text, meta) {
  const m = meta || {};
  notifications.unshift({
    id: Date.now() + Math.floor(Math.random() * 100),
    text,
    tag: m.tag || 'INFO',
    targetType: m.targetType || 'none',
    targetUrl: m.targetUrl || '',
    targetCode: m.targetCode || '',
    targetId: m.targetId || null,
    time: new Date().toLocaleTimeString()
  });
  notifications = notifications.slice(0, 40);
  saveData();
}
function checkOwner(req, res, next) {
  const key = (req.body && req.body.ownerKey) || req.headers['x-owner-key'] || req.query.ownerKey;
  if (key !== OWNER_KEY) return res.status(403).json({ error: 'Galat Owner Key!' });
  next();
}
app.get('/api/items', (req, res) => res.json({ items, posters, poster: posters[0] || null, notifications }));
app.post('/api/track-open/:code', (req, res) => {
  const item = items.find(i => i.code.toUpperCase() === req.params.code.toUpperCase());
  if (!item) return res.status(404).json({ error: 'App nahi mila' });
  item.views += 1;
  res.json({ code: item.code, views: item.views });
});
app.post('/api/owner/poster', checkOwner, (req, res) => {
  const { id, title, subtitle, mediaUrl, url } = req.body || {};
  const cleanTitle = String(title || 'SpaceStore').trim() || 'SpaceStore';
  const cleanSub = String(subtitle || 'Featured Event').trim() || 'Featured Event';
  const cleanMedia = String(mediaUrl || '').trim();
  const cleanUrl = String(url || '').trim();
  if (id) {
    const idx = posters.findIndex(p => p.id === Number(id));
    if (idx !== -1) {
      posters[idx] = { id: posters[idx].id, title: cleanTitle, subtitle: cleanSub, mediaUrl: cleanMedia, url: cleanUrl };
      addNotif('Poster update hua: ' + cleanTitle);
      return res.json({ ok: true, posters, poster: posters[idx] });
    }
  }
  const newPoster = { id: Date.now(), title: cleanTitle, subtitle: cleanSub, mediaUrl: cleanMedia, url: cleanUrl };
  posters.push(newPoster);
  addNotif('Naya Event Poster juda: ' + cleanTitle, { tag: 'POSTER', targetType: 'poster', targetUrl: cleanUrl });
  res.status(201).json({ ok: true, posters, poster: newPoster });
});
app.delete('/api/owner/poster', checkOwner, (req, res) => {
  const id = Number(req.query.id || (req.body && req.body.id) || 0);
  if (id) {
    posters = posters.filter(p => p.id !== id);
  } else if (posters.length > 0) {
    posters.pop();
  }
  addNotif('Event Poster hata diya gaya.', { tag: 'POSTER', targetType: 'poster' });
  res.json({ deleted: true, posters });
});
app.post('/api/owner/publish', checkOwner, (req, res) => {
  const { title, url, icon, category, posterId, posterTitle, posterSubtitle, posterMediaUrl, posterUrl } = req.body || {};
  if (typeof posterTitle === 'string' || typeof posterSubtitle === 'string' || typeof posterMediaUrl === 'string' || typeof posterUrl === 'string') {
    const cleanTitle = (posterTitle && posterTitle.trim()) || 'SpaceStore';
    const cleanSub = (posterSubtitle && posterSubtitle.trim()) || 'Featured Event';
    const cleanMedia = typeof posterMediaUrl === 'string' ? posterMediaUrl.trim() : '';
    const cleanUrl = typeof posterUrl === 'string' ? posterUrl.trim() : '';
    if (posterId) {
      const idx = posters.findIndex(p => p.id === Number(posterId));
      if (idx !== -1) posters[idx] = { id: posters[idx].id, title: cleanTitle, subtitle: cleanSub, mediaUrl: cleanMedia, url: cleanUrl };
      else posters.push({ id: Date.now(), title: cleanTitle, subtitle: cleanSub, mediaUrl: cleanMedia, url: cleanUrl });
    } else if (!posters.length) {
      posters.push({ id: Date.now(), title: cleanTitle, subtitle: cleanSub, mediaUrl: cleanMedia, url: cleanUrl });
    } else {
      posters[0] = { id: posters[0].id, title: cleanTitle, subtitle: cleanSub, mediaUrl: cleanMedia, url: cleanUrl };
    }
    addNotif('Event Poster update hua: ' + cleanTitle, { tag: 'POSTER', targetType: 'poster', targetUrl: cleanUrl });
  }
  if (!title && !url) saveData();
  return res.json({ posterUpdated: true, posters, poster: posters[0] || null });
  if (!title || !url) return res.status(400).json({ error: 'Name aur link zaroori hai.' });
  const code = 'SS-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  const cat = category === 'game' ? 'game' : 'app';
  const newItem = { id: Date.now(), title: title.trim(), subtitle: cat === 'game' ? 'Game' : 'App', url: url.trim(), icon: (icon && icon.trim()) || title.trim()[0].toUpperCase(), category: cat, code, views: 0, status: 'live' };
  items.unshift(newItem);
  addNotif('Naya ' + (cat === 'game' ? 'Game' : 'App') + ' joda gaya: ' + newItem.title, { tag: cat === 'game' ? 'NEW GAME' : 'NEW APP', targetType: 'item', targetUrl: newItem.url, targetCode: newItem.code, targetId: newItem.id });
  saveData();
  res.status(201).json(newItem);
});
app.put('/api/owner/items/:id', checkOwner, (req, res) => {
  const idx = items.findIndex(i => i.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Item nahi mila.' });
  const { title, url, icon, category } = req.body || {};
  if (!title || !url) return res.status(400).json({ error: 'Name aur link zaroori hai.' });
  const cat = category === 'game' ? 'game' : 'app';
  items[idx] = { ...items[idx], title: title.trim(), subtitle: cat === 'game' ? 'Game' : 'App', url: url.trim(), icon: (icon && icon.trim()) || items[idx].icon, category: cat };
  addNotif('Update hua: ' + items[idx].title, { tag: 'UPDATE', targetType: 'item', targetUrl: items[idx].url, targetCode: items[idx].code, targetId: items[idx].id });
  saveData();
  res.json(items[idx]);
});
app.delete('/api/owner/items/:id', checkOwner, (req, res) => {
  const idx = items.findIndex(i => i.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Item nahi mila.' });
  const [removed] = items.splice(idx, 1);
  saveData();
  res.json({ deleted: true, id: removed.id, title: removed.title });
});
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/owner', (req, res) => res.sendFile(path.join(__dirname, 'owner.html')));

app.get("/manifest.json", (req, res) => {
  res.type("application/manifest+json");
  res.sendFile(path.join(__dirname, "manifest.json"));
});
app.get("/icon.svg", (req, res) => {
  res.type("image/svg+xml");
  res.sendFile(path.join(__dirname, "icon.svg"));
});
app.get("/sw.js", (req, res) => {
  res.type("application/javascript");
  res.sendFile(path.join(__dirname, "sw.js"));
});


app.get("/app-logo.png", (req, res) => {
  res.type("image/png");
  res.sendFile(path.join(__dirname, "app-logo.png"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('SpaceStore server running on port ' + PORT));
