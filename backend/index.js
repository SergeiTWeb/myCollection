require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ==========================================
// HEALTH CHECK
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online', 
    time: new Date().toISOString(),
    message: 'Backend is running and connected to DB!'
  });
});

const db = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
});

// ==========================================
// FILE UPLOAD CONFIGURATION
// ==========================================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Limit file size to 5MB and only allow images
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Serve the uploaded files statically so the frontend can view them
app.use('/uploads', express.static(uploadDir));

// ==========================================
// EMAIL CONFIGURATION
// ==========================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// ==========================================
// AUTH MIDDLEWARE
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
// AUTH ROUTES
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    // 1. Check if user exists
    const [existing] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

    // 2. Hash password & generate token
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // 3. Save to DB
    await db.execute(
      'INSERT INTO users (email, password_hash, verification_token) VALUES (?, ?, ?)',
      [email, passwordHash, verificationToken]
    );

    // 4. Send Verification Email
    const verifyUrl = `http://localhost:${PORT}/api/auth/verify?token=${verificationToken}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your MyCollection Account',
      html: `<h2>Welcome to MyCollection!</h2><p>Please click the link below to verify your email and activate your account:</p><a href="${verifyUrl}">${verifyUrl}</a>`
    });

    res.status(201).json({ message: 'Registration successful! Please check your email to verify your account.' });
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
    
    // Send a simple success HTML page
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
    if (!user.is_verified) return res.status(403).json({ error: 'Please verify your email before logging in.' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid email or password' });

    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ message: 'Login successful', token, userId: user.id, email: user.email });
  } catch (error) {
    console.error('❌ Login Error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ==========================================
// PUBLIC COLLECTION ROUTE (No Auth Required)
// ==========================================
app.get('/api/users/:userId/collection', async (req, res) => {
  try {
    // Get the user's email for the page header.
    const [users] = await db.execute('SELECT email FROM users WHERE id = ?', [req.params.userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    // Retrieve the public collection (excluding sensitive data).
    const [rows] = await db.execute(
      'SELECT id, title, year, cover_image, format, notes, added_at FROM collection WHERE user_id = ? ORDER BY added_at DESC',
      [req.params.userId]
    );

    res.json({ 
      userEmail: users[0].email, 
      items: rows 
    });
  } catch (error) {
    console.error('❌ Public Collection Error:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

// ==========================================
// SECURE DISCOGS PROXY
// ==========================================
app.get('/api/search', async (req, res) => {
  const { q, format } = req.query;
  const url = `https://api.discogs.com/database/search?q=${encodeURIComponent(q)}&type=release&format=${format}&per_page=50`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MyCDCatalogueApp/1.0 +http://localhost',
        'Authorization': `Discogs key=${process.env.DISCOGS_KEY}, secret=${process.env.DISCOGS_SECRET}`
      }
    });
    const data = await response.json();
    res.json(data.results || []);
  } catch (error) { res.status(500).json({ error: 'Failed to search' }); }
});

// ==========================================
// COLLECTION ROUTES (PROTECTED)
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
  } catch (error) { res.status(500).json({ error: 'Failed to fetch' }); }
});

app.post('/api/collection', authenticateToken, upload.single('cover_image_file'), async (req, res) => {
  const { title, year, format, cover_image, notes } = req.body;
  
  if (!title) return res.status(400).json({ error: 'Title is required' });

// If a file was uploaded, use its path. Otherwise, use the URL provided (or empty string)
// Dynamically get the server URL (works on localhost AND production)
const baseUrl = req.protocol + '://' + req.get('host');
const finalCoverImage = req.file ? `${baseUrl}/uploads/${req.file.filename}` : (cover_image || '');

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
  
  // If a new file is uploaded, use it. Otherwise, keep the existing cover_image URL from the body
  const baseUrl = req.protocol + '://' + req.get('host');
  const finalCoverImage = req.file ? `${baseUrl}/uploads/${req.file.filename}` : cover_image;

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
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// ==========================================
// WISHLIST ROUTES (PROTECTED)
// ==========================================
app.get('/api/wishlist', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM wishlist WHERE user_id = ? ORDER BY added_at DESC', [req.user.id]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
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
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.delete('/api/wishlist/:id', authenticateToken, async (req, res) => {
  try {
    await db.execute('DELETE FROM wishlist WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Removed' });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));