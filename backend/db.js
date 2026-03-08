const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const dbDir = path.join(__dirname, "database");
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}
const dbPath = path.join(dbDir, "pollution.db");
const db = new Database(dbPath);
db.prepare(`
    CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        colony TEXT,
        mobile TEXT,
        image_url TEXT,
        latitude REAL,
        longitude REAL,
        issue_category TEXT,
        description TEXT,
        status TEXT,
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();
db.prepare(`
    CREATE TABLE IF NOT EXISTS request_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT,
        endpoint TEXT,
        user_agent TEXT,
        report_id TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();
module.exports = db;
