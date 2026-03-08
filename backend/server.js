const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const app = express();
app.use(cors());
app.use(express.json());
const db = new Database("./database/pollution.db");
db.prepare(`
    CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        colony TEXT,
        issue_category TEXT,
        description TEXT,
        image_url TEXT,
        latitude REAL,
        longitude REAL,
        status TEXT,
        upvotes INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        timestamp TEXT
    )
`).run();
db.prepare(`
    CREATE TABLE IF NOT EXISTS request_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT,
        endpoint TEXT,
        report_id TEXT,
        timestamp TEXT
    )
`).run();
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use("/uploads", express.static(uploadDir));
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + "_" + file.originalname;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage });
app.post("/report", upload.single("image"), (req, res) => {
    try {
        const { latitude, longitude, category, description, colony } = req.body;
        const id = "RPT-" + Date.now();
        const image_url = "uploads/" + req.file.filename;
        db.prepare(`
            INSERT INTO reports (
                id,
                colony,
                issue_category,
                description,
                image_url,
                latitude,
                longitude,
                status,
                upvotes,
                likes,
                timestamp
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            colony,
            category,
            description,
            image_url,
            latitude,
            longitude,
            "Pending",
            0,
            0,
            new Date().toISOString()
        );
        res.json({
            acknowledgement: id
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Submission failed"
        });
    }
});
app.get("/reports", (req, res) => {
    const reports = db.prepare(`
        SELECT *
        FROM reports
        ORDER BY upvotes DESC
    `).all();
    res.json(reports);
});
app.get("/report-status/:id", (req, res) => {
    const report = db.prepare(`
        SELECT *
        FROM reports
        WHERE id = ?
    `).get(req.params.id);
    if (report) {
        res.json(report);
    } else {
        res.status(404).json({
            error: "Report not found"
        });
    }
});
app.put("/report/:id", (req, res) => {
    const { status } = req.body;
    db.prepare(`
        UPDATE reports
        SET status = ?
        WHERE id = ?
    `).run(status, req.params.id);
    res.json({
        message: "Status updated successfully"
    });
});
app.delete("/report/:id", (req, res) => {
    db.prepare(`
        DELETE FROM reports
        WHERE id = ?
    `).run(req.params.id);
    res.json({
        message: "Report deleted successfully"
    });
});
app.post("/upvote/:id", (req, res) => {
    db.prepare(`
        UPDATE reports
        SET upvotes = upvotes + 1
        WHERE id = ?
    `).run(req.params.id);
    const updated = db.prepare(`
        SELECT upvotes
        FROM reports
        WHERE id = ?
    `).get(req.params.id);
    res.json(updated);
});
app.post("/like/:id", (req, res) => {
    db.prepare(`
        UPDATE reports
        SET likes = likes + 1
        WHERE id = ?
    `).run(req.params.id);
    const updated = db.prepare(`
        SELECT likes
        FROM reports
        WHERE id = ?
    `).get(req.params.id);
    res.json(updated);
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
