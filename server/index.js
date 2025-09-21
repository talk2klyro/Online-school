/* server/index.js
   Express API with Neon/Postgres or SQLite fallback.
   - Creates tables on startup (if not existing).
   - Exposes endpoints used by the front-end.
   - Publishes attendance updates to Ably (server-side) so clients can subscribe via authUrl.
*/

require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const USE_SQLITE = process.env.USE_SQLITE === 'true' || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('sqlite:'));

let dbClient = null; // abstracted
let isPostgres = false;

const initDb = async () => {
/* server/index.js
   Express API with Neon/Postgres or SQLite fallback.
   - Creates tables on startup (if not existing).
   - Exposes endpoints used by the front-end.
   - Publishes attendance updates to Ably (server-side) so clients can subscribe via authUrl.
*/

require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const USE_SQLITE = process.env.USE_SQLITE === 'true' || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('sqlite:'));

let dbClient = null; // abstracted
let isPostgres = false;

const initDb = async () => {
  if (USE_SQLITE) {
    // SQLite via better-sqlite3 (synchronous API)
    const Database = require('better-sqlite3');
    const dbPath = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/^sqlite:/, '') : './data.sqlite';
    const db = new Database(dbPath);
    // create tables
    db.prepare(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        sn TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        class_id TEXT,
        week INTEGER,
        present INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(student_id, class_id, week)
      );
    `).run();

    dbClient = {
      type: 'sqlite',
      db,
      async all(sql, params = []) { return db.prepare(sql).all(...params); },
      async get(sql, params = []) { return db.prepare(sql).get(...params); },
      async run(sql, params = []) { return db.prepare(sql).run(...params); }
    };
  } else {
    // Postgres
    const { Pool } = require('pg');
    isPostgres = true;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    // create tables (server-side generated uuids)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        sn TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        class_id TEXT,
        week INTEGER,
        present BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        UNIQUE(student_id, class_id, week)
      );
    `);

    dbClient = {
      type: 'pg',
      pool,
      async all(sql, params=[]) { const r = await pool.query(sql, params); return r.rows; },
      async get(sql, params=[]) { const r = await pool.query(sql, params); return r.rows[0]; },
      async run(sql, params=[]) { return pool.query(sql, params); }
    };
  }
};

(async function bootstrap(){
  await initDb();

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(bodyParser.json());

  // Serve your static frontend
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));

  // --- Ably, Cloudinary, Magic setup (server keys from env) ---
  let ablyRest = null;
  if (process.env.ABLY_API_KEY) {
    const Ably = require('ably');
    ablyRest = new Ably.Rest({ key: process.env.ABLY_API_KEY });
    console.log('Ably Rest configured');
  }

  let cloudinary = null;
  if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('Cloudinary configured');
  }

  let magicAdmin = null;
  if (process.env.MAGIC_SECRET_KEY) {
    const { Magic } = require('@magic-sdk/admin');
    magicAdmin = new Magic(process.env.MAGIC_SECRET_KEY);
    console.log('Magic admin configured');
  }

  // Helper: optional Magic verify middleware
  async function verifyMagic(req, res, next) {
    if (!magicAdmin) return next(); // not configured -> skip (DEVELOPMENT)
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.body?.didToken;
      if (!token) return res.status(401).json({ error: 'Missing DID token' });
      const meta = await magicAdmin.users.getMetadataByToken(token);
      req.user = meta; // { issuer, publicAddress, email, ... }
      return next();
    } catch (err) {
      console.error('Magic verify failed', err);
      return res.status(401).json({ error: 'Invalid session' });
    }
  }

  /* ------------------------------
     STUDENTS
     GET /api/students
     POST /api/students
     DELETE /api/students/:id
     ------------------------------ */
  app.get('/api/students', async (req,res) => {
    try {
      const rows = await dbClient.all('SELECT id, sn, name, phone, created_at FROM students ORDER BY created_at DESC;');
      res.json(rows);
    } catch (err) {
      console.error('GET students error', err); res.status(500).json({ error: 'failed' });
    }
  });

  app.post('/api/students', verifyMagic, async (req,res) => {
    try {
      const { name, phone, sn } = req.body;
      if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });
      const id = uuidv4();
      if (dbClient.type === 'sqlite') {
        dbClient.run('INSERT INTO students (id, sn, name, phone, created_at) VALUES (?, ?, ?, ?, datetime("now"))', [id, sn||null, name, phone]);
      } else {
        await dbClient.run('INSERT INTO students (id, sn, name, phone) VALUES ($1,$2,$3,$4)', [id, sn||null, name, phone]);
      }
      res.json({ id, name, phone, sn });
    } catch (err) {
      console.error('POST students error', err); res.status(500).json({ error: 'failed' });
    }
  });

  app.delete('/api/students/:id', verifyMagic, async (req,res) => {
    try {
      const id = req.params.id;
      if (dbClient.type === 'sqlite') {
        dbClient.run('DELETE FROM students WHERE id = ?', [id]);
      } else {
        await dbClient.run('DELETE FROM students WHERE id = $1', [id]);
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('DELETE student', err); res.status(500).json({ error: 'failed' });
    }
  });

  /* ------------------------------
     ATTENDANCE
     PUT /api/attendance
     body: { id: studentId, week: 'week1' or number, present: boolean, classId: 'class-1' }
     ------------------------------ */
  app.put('/api/attendance', verifyMagic, async (req,res) => {
    try {
      const { id: studentId, week, present, classId } = req.body;
      if (!studentId || !week) return res.status(400).json({ error: 'student id and week required' });

      // make week an integer if string like 'week3' passed
      let weekNum = typeof week === 'string' && week.match(/week(\d+)/i) ? parseInt(week.match(/week(\d+)/i)[1], 10) : Number(week);

      // upsert style: check existing
      const existing = await dbClient.get('SELECT id FROM attendance WHERE student_id = ? AND class_id = ? AND week = ?',
        dbClient.type === 'sqlite' ? [studentId, classId || null, weekNum] : [studentId, classId || null, weekNum]);

      const now = new Date().toISOString();
      if (existing && existing.id) {
        // update
        if (dbClient.type === 'sqlite') {
          dbClient.run('UPDATE attendance SET present = ?, updated_at = datetime("now") WHERE id = ?', [present ? 1 : 0, existing.id]);
        } else {
          await dbClient.run('UPDATE attendance SET present=$1, updated_at=now() WHERE id=$2', [present, existing.id]);
        }
      } else {
        const attId = uuidv4();
        if (dbClient.type === 'sqlite') {
          dbClient.run('INSERT INTO attendance (id, student_id, class_id, week, present, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
            [attId, studentId, classId || null, weekNum, present ? 1 : 0]);
        } else {
          await dbClient.run('INSERT INTO attendance (id, student_id, class_id, week, present, updated_at) VALUES ($1,$2,$3,$4,$5,now())',
            [attId, studentId, classId || null, weekNum, present]);
        }
      }

      // Publish event to Ably (server-side) so clients receive realtime update
      if (ablyRest && classId) {
        try {
          ablyRest.channels.get(`attendance-${classId}`).publish('update', {
            studentId, week: `week${weekNum}`, present: !!present, updatedBy: req.user?.email || 'unknown', ts: now
          });
        } catch (err) {
          console.warn('Ably publish failed', err);
        }
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('PUT attendance error', err); res.status(500).json({ error: 'failed' });
    }
  });

  /* ------------------------------
     EXPORT
     GET /api/export?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv
     ------------------------------ */
  app.get('/api/export', verifyMagic, async (req,res) => {
    try {
      const from = req.query.from;
      const to = req.query.to;
      const format = req.query.format || 'csv';

      // Basic date validation (server trusts properly formatted dates)
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;

      // Fetch attendance rows joined with student info
      let rows;
      if (dbClient.type === 'sqlite') {
        let q = `SELECT a.student_id, a.class_id, a.week, a.present, a.updated_at, s.name, s.phone, s.sn
                 FROM attendance a JOIN students s ON s.id = a.student_id`;
        const params = [];
        if (fromDate && toDate) { q += ' WHERE date(a.updated_at) BETWEEN date(?) AND date(?)'; params.push(from, to); }
        q += ' ORDER BY a.updated_at DESC LIMIT 10000';
        rows = dbClient.all(q, params);
      } else {
        let q = `SELECT a.student_id, a.class_id, a.week, a.present, a.updated_at, s.name, s.phone, s.sn
                 FROM attendance a JOIN students s ON s.id = a.student_id`;
        const params = [];
        if (fromDate && toDate) { q += ' WHERE a.updated_at::date BETWEEN $1::date AND $2::date'; params.push(from, to); }
        q += ' ORDER BY a.updated_at DESC LIMIT 10000';
        rows = await dbClient.all(q, params);
      }

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-${from||'start'}-${to||'end'}.csv"`);

        const header = ['student_id','name','phone','sn','class_id','week','present','updated_at'].join(',');
        res.write(header + '\n');
        for (const r of rows) {
          const line = [
            r.student_id, `"${(r.name||'').replace(/"/g,'""')}"`, (r.phone||''), (r.sn||''), (r.class_id||''), r.week, r.present ? '1' : '0', r.updated_at
          ].join(',');
          res.write(line + '\n');
        }
        return res.end();
      }

      // For PDF/XLSX: not implemented server-side here. Return JSON to allow client-side export.
      res.json({ rows });
    } catch (err) {
      console.error('EXPORT error', err); res.status(500).json({ error: 'failed' });
    }
  });

  /* ------------------------------
     Ably token request for client (authUrl)
     POST /api/ably/token or GET
     returns tokenRequest { keyName, ttl, capability, ... } expected by Ably client
     ------------------------------ */
  app.get('/api/ably/token', async (req,res) => {
    if (!ablyRest) return res.status(501).json({ error: 'Ably not configured' });
    ablyRest.auth.createTokenRequest({}, (err, tokenRequest) => {
      if (err) { console.error('Ably token error', err); return res.status(500).json({ error: 'ably token failed' }); }
      res.json(tokenRequest);
    });
  });

  /* ------------------------------
     Cloudinary signing endpoint
     POST /api/cloudinary/sign
     Expects body with object of params to sign (e.g. { timestamp, folder })
     Returns signature, timestamp, api_key, cloud_name
     ------------------------------ */
  app.post('/api/cloudinary/sign', verifyMagic, (req,res) => {
    if (!cloudinary) return res.status(501).json({ error: 'Cloudinary not configured' });
    const paramsToSign = req.body || {};
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = { ...paramsToSign, timestamp };
    const signature = cloudinary.utils.api_sign_request(toSign, process.env.CLOUDINARY_API_SECRET);
    res.json({ signature, timestamp, api_key: process.env.CLOUDINARY_API_KEY, cloud_name: process.env.CLOUDINARY_CLOUD_NAME });
  });

  /* ------------------------------
     Magic server verify — verifies DID token and returns metadata
     POST /api/magic/verify
     body: { didToken } or Authorization: Bearer <didToken>
     ------------------------------ */
  app.post('/api/magic/verify', async (req,res) => {
    if (!magicAdmin) return res.status(501).json({ error: 'Magic not configured' });
    const token = req.body?.didToken || (req.headers.authorization||'').split(' ')[1];
    if (!token) return res.status(400).json({ error: 'missing token' });
    try {
      const meta = await magicAdmin.users.getMetadataByToken(token);
      return res.json({ ok: true, meta });
    } catch (err) {
      console.error('magic verify err', err); return res.status(401).json({ error: 'invalid token' });
    }
  });

  // Catch-all for SPA routing: serve index.html (if desired)
  app.get('*', (req,res) => {
    // If you want client side routing, uncomment next line:
    // res.sendFile(path.join(publicPath, 'index.html'));
    res.status(404).json({ error: 'not found' });
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`API server running on port ${port}`));

})();
