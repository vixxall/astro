const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const hostname = '0.0.0.0';
const port = process.env.PORT || 3001;
const publicDir = path.join(__dirname, 'site');
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'astrohub.json');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp'
};

const DEV_TOKEN_SECRET = 'astrohub-dev-secret';
const TOKEN_SECRET = process.env.ASTROHUB_TOKEN_SECRET || DEV_TOKEN_SECRET;
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

if (TOKEN_SECRET === DEV_TOKEN_SECRET) {
  console.warn(
    '[SECURITY WARNING] ASTROHUB_TOKEN_SECRET is not set — using the well-known ' +
    'default dev secret. Anyone who reads the source can forge login/admin tokens. ' +
    'Set ASTROHUB_TOKEN_SECRET to a long random value before deploying.'
  );
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

// Password hashing: scrypt with a random per-user salt (Node stdlib, no extra deps).
// Stored as "salt:hash" hex. Plain sha256 (no salt) is intentionally not supported
// for new hashes because it's fast to brute-force and offers no rainbow-table protection.
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function hmac(input) {
  return crypto.createHmac('sha256', TOKEN_SECRET).update(input).digest('base64url');
}

function createToken(payload) {
  const fullPayload = { ...payload, iat: Date.now(), exp: Date.now() + TOKEN_TTL_MS };
  const encodedPayload = base64url(JSON.stringify(fullPayload));
  const signature = hmac(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;
  // Constant-time comparison to avoid leaking the expected signature via timing.
  const expectedSignature = hmac(encodedPayload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (typeof payload.exp === 'number' && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({
      users: [],
      favorites: {},
      leaderboard: []
    }, null, 2));
  }
}

function readData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

// Writes are serialized through this promise chain and written atomically
// (temp file + rename) so two concurrent requests can't interleave writes
// and corrupt or lose data.
let writeQueue = Promise.resolve();

function writeData(data) {
  ensureDataFile();
  writeQueue = writeQueue.then(() => new Promise((resolve, reject) => {
    const tmpFile = `${dataFile}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFile(tmpFile, JSON.stringify(data, null, 2), (err) => {
      if (err) return reject(err);
      fs.rename(tmpFile, dataFile, (renameErr) => {
        if (renameErr) return reject(renameErr);
        resolve();
      });
    });
  })).catch((err) => {
    console.error('Failed to write data file:', err);
  });
  return writeQueue;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Simple in-memory rate limiter for auth endpoints (per IP+route).
// Not a substitute for a real WAF/rate-limiting layer, but stops trivial
// scripted brute-force / credential-stuffing against /login and /register.
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 10;
const rateLimitBuckets = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(routeKey, req) {
  const key = `${routeKey}:${getClientIp(req)}`;
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, { windowStart: now, count: 1 });
    return null;
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX_ATTEMPTS) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  return null;
}

function clearRateLimit(routeKey, req) {
  rateLimitBuckets.delete(`${routeKey}:${getClientIp(req)}`);
}

function getUserFromRequest(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const payload = verifyToken(token);
  if (!payload?.email) return null;
  return payload;
}
function getAdminEmails() {
  // Admins are controlled entirely via the ADMIN_EMAILS env var (comma-separated)
  // or a user's `role` field. No email is hardcoded in source, since anyone who
  // reads the repo would otherwise know exactly which account to target.
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

// NASA's free API key is rate limited. Keep a short in-memory cache so a
// deployment with several visitors does not spend the same request repeatedly.
const apodCache = new Map();
const APOD_CACHE_TTL_MS = 10 * 60 * 1000;
const APOD_REQUEST_TIMEOUT_MS = 10000;

function apodFallback(date, message) {
  return {
    error: message,
    fallback: true,
    title: 'Cosmic Nebula',
    date: date || new Date().toISOString().split('T')[0],
    explanation: 'NASA APOD is temporarily unavailable. Please try again shortly.',
    media_type: 'image',
    // Root-relative paths work when the API is called from any page.
    url: '/images/nebula.png',
    hdurl: '/images/nebula.png'
  };
}

function fetchNasaApod(date) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    const query = new URLSearchParams({ api_key: apiKey });
    if (date) query.set('date', date);
    const nasaReq = https.get(`https://api.nasa.gov/planetary/apod?${query}`, (nasaRes) => {
      let body = '';
      nasaRes.setEncoding('utf8');
      nasaRes.on('data', (chunk) => { body += chunk; });
      nasaRes.on('end', () => {
        if (nasaRes.statusCode !== 200) {
          return reject(new Error(`NASA API returned ${nasaRes.statusCode}: ${body.slice(0, 200)}`));
        }
        try {
          const payload = JSON.parse(body);
          if (!payload || !payload.url || !payload.date) {
            return reject(new Error('NASA API returned an incomplete APOD response'));
          }
          resolve(payload);
        } catch (error) {
          reject(new Error(`NASA API returned invalid JSON: ${error.message}`));
        }
      });
    });
    nasaReq.setTimeout(APOD_REQUEST_TIMEOUT_MS, () => {
      nasaReq.destroy(new Error('NASA API request timed out'));
    });
    nasaReq.on('error', reject);
  });
}

function findUserByEmail(data, email) {
  return data.users.find((item) => item.email === String(email || '').toLowerCase()) || null;
}

function isAdminUser(data, user) {
  if (!user?.email) return false;
  const email = String(user.email).toLowerCase();
  const userRecord = findUserByEmail(data, email);
  const adminEmails = getAdminEmails();
  const hasConfiguredAdmin = adminEmails.length > 0 || data.users.some((item) => ['admin', 'superadmin'].includes(item.role));
  const isFirstUserFallback = !hasConfiguredAdmin && data.users[0]?.email === email;
  return adminEmails.includes(email) || ['admin', 'superadmin'].includes(userRecord?.role) || isFirstUserFallback;
}

function publicUser(userRecord, data) {
  const favorites = data.favorites[userRecord.email] || {};
  return {
    id: userRecord.id,
    firstName: userRecord.firstName,
    lastName: userRecord.lastName,
    email: userRecord.email,
    role: userRecord.role || 'user',
    isAdmin: isAdminUser(data, userRecord),
    createdAt: userRecord.createdAt,
    favoritesCount: Object.keys(favorites).length
  };
}

function normalizeKey(key) {
  return String(key || '').trim();
}

function getFavoritesBucket(data, email) {
  if (!data.favorites[email]) data.favorites[email] = {};
  return data.favorites[email];
}

function getLeaderboardList(data) {
  if (!Array.isArray(data.leaderboard)) data.leaderboard = [];
  return data.leaderboard;
}

function safePathFromUrl(requestPath) {
  if (requestPath === '/') return '/index.html';
  const normalized = path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[\\/])+/, '');
  return normalized;
}

function serveStatic(req, res, requestPath) {
  const safePath = safePathFromUrl(requestPath);
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      sendText(res, 404, 'Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) return sendText(res, 500, 'Server Error');
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
}

function handleApi(req, res, parsedUrl) {
  const data = readData();
  const user = getUserFromRequest(req);
  const requestPath = parsedUrl.pathname;

  if (requestPath === '/api/health') {
    return sendJson(res, 200, { ok: true });
  }

  if (requestPath === '/api/nasa/apod' && req.method === 'GET') {
    const date = parsedUrl.searchParams.get('date');
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendJson(res, 400, { error: 'date must use YYYY-MM-DD format' });
    }

    const cacheKey = date || 'today';
    const cached = apodCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < APOD_CACHE_TTL_MS) {
      return sendJson(res, 200, cached.payload);
    }

    fetchNasaApod(date)
      .then((payload) => {
        apodCache.set(cacheKey, { createdAt: Date.now(), payload });
        sendJson(res, 200, payload);
      })
      .catch((err) => {
        console.error('NASA APOD request failed:', err.message);
        sendJson(res, 200, apodFallback(date, 'NASA APOD is temporarily unavailable'));
      });
    return;
  }

  if (requestPath === '/api/auth/register' && req.method === 'POST') {
    const rateLimitError = checkRateLimit('register', req);
    if (rateLimitError) return sendJson(res, 429, { error: rateLimitError });

    return getRequestBody(req)
      .then(async (body) => {
        const firstName = String(body.firstName || '').trim();
        const lastName = String(body.lastName || '').trim();
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');

        if (!firstName || !email || !password) {
          return sendJson(res, 400, { error: 'First name, email, and password are required.' });
        }
        if (password.length < 6) {
          return sendJson(res, 400, { error: 'Password must be at least 6 characters.' });
        }
        if (data.users.some((item) => item.email === email)) {
          return sendJson(res, 409, { error: 'An account with this email already exists.' });
        }

        const userRecord = {
          id: crypto.randomUUID(),
          firstName,
          lastName,
          email,
          passwordHash: hashPassword(password),
          createdAt: new Date().toISOString()
        };
        data.users.push(userRecord);
        await writeData(data);

        const token = createToken({ email, firstName, lastName, id: userRecord.id });
        sendJson(res, 201, {
          token,
          user: publicUser(userRecord, data)
        });
      })
      .catch((err) => sendJson(res, 400, { error: err.message }));
  }

  if (requestPath === '/api/auth/login' && req.method === 'POST') {
    const rateLimitError = checkRateLimit('login', req);
    if (rateLimitError) return sendJson(res, 429, { error: rateLimitError });

    return getRequestBody(req)
      .then((body) => {
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');
        const userRecord = data.users.find((item) => item.email === email);

        if (!userRecord || !verifyPassword(password, userRecord.passwordHash)) {
          return sendJson(res, 401, { error: 'Invalid email or password.' });
        }
        clearRateLimit('login', req);

        const token = createToken({
          email: userRecord.email,
          firstName: userRecord.firstName,
          lastName: userRecord.lastName,
          id: userRecord.id
        });

        sendJson(res, 200, {
          token,
          user: publicUser(userRecord, data)
        });
      })
      .catch((err) => sendJson(res, 400, { error: err.message }));
  }


  if (requestPath === '/api/admin/me' && req.method === 'GET') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    return sendJson(res, 200, { isAdmin: isAdminUser(data, user) });
  }

  if (requestPath === '/api/admin/overview' && req.method === 'GET') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    if (!isAdminUser(data, user)) return sendJson(res, 403, { error: 'Admin access required' });

    const users = data.users.map((item) => publicUser(item, data));
    const leaderboard = getLeaderboardList(data)
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 25);
    const totalFavorites = Object.values(data.favorites || {})
      .reduce((sum, bucket) => sum + Object.keys(bucket || {}).length, 0);
    const recentUsers = users
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 8);

    return sendJson(res, 200, {
      stats: {
        users: users.length,
        favorites: totalFavorites,
        leaderboardEntries: getLeaderboardList(data).length,
        admins: users.filter((item) => item.isAdmin).length
      },
      users,
      recentUsers,
      leaderboard
    });
  }
  if (requestPath === '/api/favorites' && req.method === 'GET') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    const favorites = getFavoritesBucket(data, user.email);
    return sendJson(res, 200, favorites);
  }

  if (requestPath === '/api/favorites' && req.method === 'POST') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    return getRequestBody(req)
      .then((body) => {
        const key = normalizeKey(body.key);
        if (!key) return sendJson(res, 400, { error: 'Favorite key is required.' });
        const favorites = getFavoritesBucket(data, user.email);
        favorites[key] = {
          type: body.type || '',
          name: body.name || '',
          image: body.image || '',
          subtitle: body.subtitle || '',
          link: body.link || ''
        };
        writeData(data);
        sendJson(res, 200, favorites);
      })
      .catch((err) => sendJson(res, 400, { error: err.message }));
  }

  const favoriteMatch = requestPath.match(/^\/api\/favorites\/(.+)$/);
  if (favoriteMatch && req.method === 'DELETE') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    const key = normalizeKey(decodeURIComponent(favoriteMatch[1]));
    const favorites = getFavoritesBucket(data, user.email);
    delete favorites[key];
    writeData(data);
    return sendJson(res, 200, favorites);
  }

  if (requestPath === '/api/leaderboard' && req.method === 'GET') {
    const leaderboard = getLeaderboardList(data)
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    return sendJson(res, 200, { leaderboard });
  }

  if (requestPath === '/api/leaderboard' && req.method === 'POST') {
    return getRequestBody(req)
      .then((body) => {
        const callsign = String(body.callsign || '').trim().toUpperCase() || 'PILOT-AH';
        const score = Number(body.score || 0);
        const topic = String(body.topic || 'All').trim();
        const leaderboard = getLeaderboardList(data);
        leaderboard.push({
          callsign,
          score,
          topic,
          submittedAt: new Date().toISOString(),
          submittedBy: user?.email || null
        });
        leaderboard.sort((a, b) => b.score - a.score);
        data.leaderboard = leaderboard.slice(0, 10);
        writeData(data);
        sendJson(res, 200, { leaderboard: data.leaderboard });
      })
      .catch((err) => sendJson(res, 400, { error: err.message }));
  }

  sendJson(res, 404, { error: 'Not Found' });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (parsedUrl.pathname.startsWith('/api/')) {
    return handleApi(req, res, parsedUrl);
  }
  return serveStatic(req, res, parsedUrl.pathname);
});

server.listen(port, hostname, () => {
  console.log(`Astro Hub is running at http://${hostname}:${port}`);
});
