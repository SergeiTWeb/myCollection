require('dotenv').config();

// DEBUG LOG: This will show up in your Vercel Function Logs to prove ENV variables are loading
console.log('🔍 ENV CHECK: DB_HOST is', process.env.DB_HOST ? 'SET' : 'MISSING');
console.log('🔍 ENV CHECK: DB_USER is', process.env.DB_USER ? 'SET' : 'MISSING');

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ==========================================
// 1. MIDDLEWARE & CORS
// ==========================================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://mycollection.sergeitumanov.com', // Custom domain
  'https://my-collection-fawn.vercel.app', // Vercel frontend
  ...(process.env.FRONTEND_URLS
    ? process.env.FRONTEND_URLS.split(',').map((url) => url.trim()).filter(Boolean)
    : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin/non-browser requests, configured origins, and Vercel previews.
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Vercel has a hard 4.5MB limit. Set Express to 4MB to catch oversized Base64 early.
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));

// ==========================================
// 2. HEALTH CHECK
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online', 
    time: new Date().toISOString(),
    message: 'Backend is running on Vercel!'
  });
});

// ==========================================
// 3. DATABASE CONNECTION
// ==========================================
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5, // Lowered for serverless environments
  queueLimit: 0
});

// ==========================================
// 4. FILE UPLOAD CONFIGURATION
// Vercel's filesystem is read-only/ephemeral, so uploads are kept in memory
// and persisted in the database as Base64 data URLs instead of on disk.
// ==========================================
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed!'), false);
  }
});

const fileToDataUrl = (file) =>
  file ? `data:${file.mimetype};base64,${file.buffer.toString('base64')}` : '';

// Legacy static serving (local dev only). Must never throw at startup:
// on Vercel the filesystem is read-only, which would crash the function.
const legacyUploadDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(legacyUploadDir)) {
    fs.mkdirSync(legacyUploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(legacyUploadDir));
} catch (error) {
  console.warn('⚠️ Upload directory unavailable; legacy file serving disabled:', error.message);
}

// ==========================================
// 5. EMAIL CONFIGURATION
// ==========================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// ==========================================
// 6. AUTH MIDDLEWARE
// ==========================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// ==========================================
// 7. AUTH ROUTES
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const [existing] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await db.execute(
      'INSERT INTO users (email, password_hash, verification_token) VALUES (?, ?, ?)',
      [email, passwordHash, verificationToken]
    );

    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://my-collection-fawn.vercel.app' 
      : `http://localhost:${PORT}`;
      
    const verifyUrl = `${baseUrl}/api/auth/verify?token=${verificationToken}`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your MyCollection Account',
      html: `<h2>Welcome to MyCollection!</h2><p>Please click the link below to verify your email:</p><a href="${verifyUrl}">${verifyUrl}</a>`
    });

    res.status(201).json({ message: 'Registration successful! Please check your email.' });
  } catch (error) {
    console.error('❌ Register Error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

app.get('/api/auth/verify', async (req, res) => {
  const { token } = req.query;
  try {
    const [result] = await db.execute('UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = ?', [token]);
    if (result.affectedRows === 0) return res.status(400).send('Invalid or expired token.');
    res.send('<h1>Email Verified!</h1><p>You can now close this window and log in to MyCollection.</p>');
  } catch (error) {
    res.status(500).send('Server error during verification.');
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

    const user = users[0];
    // Note: If you disabled email verification, comment out the next line:
    // if (!user.is_verified) return res.status(403).json({ error: 'Please verify your email before logging in.' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ message: 'Login successful', token, userId: user.id, email: user.email });
  } catch (error) {
    console.error('❌ Login Error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ==========================================
// 8. PUBLIC COLLECTION ROUTE
// ==========================================
app.get('/api/users/:userId/collection', async (req, res) => {
  try {
    const [users] = await db.execute('SELECT email FROM users WHERE id = ?', [req.params.userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const [rows] = await db.execute(
      'SELECT id, title, year, cover_image, format, notes, added_at FROM collection WHERE user_id = ? ORDER BY added_at DESC',
      [req.params.userId]
    );

    res.json({ userEmail: users[0].email, items: rows });
  } catch (error) {
    console.error('❌ Public Collection Error:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

// ==========================================
// 9. SECURE DISCOGS PROXY
// ==========================================
app.get('/api/search', async (req, res) => {
  const { q, format } = req.query;
  if (!q) return res.status(400).json({ error: 'Search query is required' });

  const url = new URL('https://api.discogs.com/database/search');
  url.searchParams.set('q', q);
  url.searchParams.set('type', 'release');
  if (format) url.searchParams.set('format', format);
  url.searchParams.set('per_page', '50');

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MyCollectionApp/1.0',
        'Authorization': `Discogs key=${process.env.DISCOGS_KEY}, secret=${process.env.DISCOGS_SECRET}`
      }
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`❌ Discogs API ${response.status}:`, body.slice(0, 500));
      return res.status(502).json({ error: `Discogs API error (${response.status})` });
    }

    const data = await response.json();
    res.json(data.results || []);
  } catch (error) { 
    console.error('Discogs API Error:', error);
    res.status(502).json({ error: 'Failed to search Discogs' }); 
  }
});

// ==========================================
// 10. COLLECTION ROUTES (PROTECTED)
// ==========================================
app.get('/api/collection', authenticateToken, async (req, res) => {
  try {
    const { format } = req.query;
    let query = 'SELECT * FROM collection WHERE user_id = ?';
    let params = [req.user.id];
    if (format && format !== 'All') { query += ' AND format = ?'; params.push(format); }
    query += ' ORDER BY added_at DESC';
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (error) { 
    console.error('❌ Fetch Collection Error:', error);
    res.status(500).json({ error: 'Failed to fetch' }); 
  }
});

app.post('/api/collection', authenticateToken, upload.single('cover_image_file'), async (req, res) => {
  const { title, year, format, cover_image, notes } = req.body;
  
  if (!title) return res.status(400).json({ error: 'Title is required' });

  // PRIORITY: Use Base64 string from 'cover_image'. Fallback to the in-memory upload.
  const finalCoverImage = cover_image || fileToDataUrl(req.file);

  try {
    const [result] = await db.execute(
      'INSERT INTO collection (user_id, discogs_id, title, year, cover_image, format, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, null, title, String(year || ''), finalCoverImage, format, notes || '']
    );
    res.status(201).json({ message: 'Added!', id: result.insertId });
  } catch (error) {
    console.error('❌ DB Error:', error);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Already in collection!' });
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.put('/api/collection/:id', authenticateToken, upload.single('cover_image_file'), async (req, res) => {
  const { title, year, format, cover_image, notes } = req.body;
  
  const finalCoverImage = cover_image || fileToDataUrl(req.file);

  try {
    await db.execute(
      'UPDATE collection SET title = ?, year = ?, format = ?, cover_image = ?, notes = ? WHERE id = ? AND user_id = ?',
      [title, String(year || ''), format, finalCoverImage, notes || '', req.params.id, req.user.id]
    );
    res.json({ message: 'Updated!' });
  } catch (error) {
    console.error('❌ DB Error:', error);
    res.status(500).json({ error: 'Failed to update' });
  }
});

app.delete('/api/collection/:id', authenticateToken, async (req, res) => {
  try {
    await db.execute('DELETE FROM collection WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (error) { 
    console.error('❌ Delete Error:', error);
    res.status(500).json({ error: 'Failed' }); 
  }
});

// ==========================================
// 11. WISHLIST ROUTES (PROTECTED)
// ==========================================
app.get('/api/wishlist', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM wishlist WHERE user_id = ? ORDER BY added_at DESC', [req.user.id]);
    res.json(rows);
  } catch (error) { 
    console.error('❌ Wishlist Fetch Error:', error);
    res.status(500).json({ error: 'Failed' }); 
  }
});

app.post('/api/wishlist', authenticateToken, async (req, res) => {
  const { id, title, year, cover_image, format } = req.body;
  try {
    const [result] = await db.execute(
      'INSERT INTO wishlist (user_id, discogs_id, title, year, cover_image, format) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, id, title, String(year || ''), cover_image || '', format]
    );
    res.status(201).json({ message: 'Added!', id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Already in wishlist!' });
    console.error('❌ Wishlist Save Error:', error);
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.delete('/api/wishlist/:id', authenticateToken, async (req, res) => {
  try {
    await db.execute('DELETE FROM wishlist WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Removed' });
  } catch (error) { 
    console.error('❌ Wishlist Delete Error:', error);
    res.status(500).json({ error: 'Failed' }); 
  }
});

// ==========================================
// 12. VERCEL SERVERLESS EXPORT
// ==========================================
module.exports = app;

// Only start the local server if this file is run directly (not imported by Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Local Backend running on http://localhost:${PORT}`);
  });
}