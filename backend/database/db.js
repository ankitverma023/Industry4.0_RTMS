const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'rtms.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS machines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS work_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id TEXT NOT NULL,
      recipe TEXT NOT NULL,
      target INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      defects INTEGER DEFAULT 0,
      speed INTEGER DEFAULT 100,
      status TEXT DEFAULT 'queued',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    )`);

    // Maintenance Logs Table
    db.run(`CREATE TABLE IF NOT EXISTS maintenance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id TEXT NOT NULL,
      type TEXT NOT NULL,
      technician TEXT NOT NULL,
      parts_replaced TEXT,
      duration_hrs REAL NOT NULL,
      cost REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    const seedUser = async (username, password, role) => {
      db.get("SELECT * FROM users WHERE username = ?", [username], async (err, row) => {
        if (!row) {
          const hash = await bcrypt.hash(password, 10);
          db.run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", [username, hash, role]);
          console.log(`Default ${role} user created (${username} / ${password})`);
        }
      });
    };

    seedUser('admin', 'admin123', 'admin');
    seedUser('operator', 'operator123', 'operator');
    seedUser('viewer', 'viewer123', 'viewer');

    db.get("SELECT COUNT(*) AS count FROM machines", (err, row) => {
      if (row && row.count === 0) {
        const defaultMachines = [
          ['cnc-01', 'CNC Machine 1', 'Milling', 'Running'],
          ['cnc-02', 'CNC Machine 2', 'Turning', 'Warning'],
          ['press-01', 'Hydraulic Press 1', 'Press', 'Running'],
          ['motor-03', 'Main Conveyor Motor', 'Motor', 'Fault'],
          ['assembly-01', 'Assembly Line A', 'Assembly', 'Running'],
          ['packaging-02', 'Packaging Unit B', 'Packaging', 'Idle']
        ];
        const stmt = db.prepare("INSERT INTO machines (machine_id, name, type, status) VALUES (?, ?, ?, ?)");
        defaultMachines.forEach(m => stmt.run(m));
        stmt.finalize();
        console.log('Default machines seeded into database.');
      }
    });

    db.get("SELECT COUNT(*) AS count FROM settings", (err, row) => {
      if (row && row.count === 0) {
        const defaultSettings = [
          ['temp_warning_limit', '85'],
          ['temp_critical_limit', '95'],
          ['vib_warning_limit', '10'],
          ['vib_critical_limit', '15']
        ];
        const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
        defaultSettings.forEach(s => stmt.run(s));
        stmt.finalize();
        console.log('Default AI settings seeded into database.');
      }
    });
  });
}

module.exports = db;
