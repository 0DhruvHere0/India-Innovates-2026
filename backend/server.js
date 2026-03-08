const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("./db");
const app = express();
app.use(cors());
app.use(express.json());
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use("/uploads", express.static(uploadsDir));
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "_" + file.originalname);
    }
});
const upload = multer({ storage });
function logRequest(req, endpoint, reportId = null) {
    const ip = req.ip.replace("::ffff:", "");
    const agent = req.headers["user-agent"];
    db.prepare(`
        INSERT INTO request_logs
        (ip_address,endpoint,user_agent,report_id)
        VALUES (?,?,?,?)
    `).run(ip, endpoint, agent, reportId);
}
function checkSubmissionLimit(ip) {
    const result = db.prepare(`
        SELECT COUNT(*) as count
        FROM request_logs
        WHERE ip_address = ?
        AND endpoint = '/report'
        AND timestamp >= datetime('now','-15 minutes')
    `).get(ip);
    return result.count >= 3;
}
function checkVoteLimit(ip, reportId) {
    const result = db.prepare(`
        SELECT COUNT(*) as count
        FROM request_logs
        WHERE ip_address = ?
        AND endpoint = '/upvote'
        AND report_id = ?
        AND timestamp >= datetime('now','-6 hours')
    `).get(ip, reportId);
    return result.count >= 1;
}
app.post("/report", upload.single("image"), (req, res) => {
    try {
        const ip = req.ip.replace("::ffff:", "");
        if (checkSubmissionLimit(ip)) {
            return res.status(429).json({
                error: "Too many complaints submitted. Try again later."
            });
        }
        if (!req.file) {
            return res.status(400).json({ error: "Image required" });
        }
        const id = "RPT-" + Date.now();
        const colony = req.body.colony || "Unknown";
        const mobile = req.body.mobile || null;
        const image = "uploads/" + req.file.filename;
        const latitude = parseFloat(req.body.latitude);
        const longitude = parseFloat(req.body.longitude);
        const category = req.body.category;
        const description = req.body.description;
        db.prepare(`
            INSERT INTO reports
            (id,colony,mobile,image_url,latitude,longitude,issue_category,description,status)
            VALUES (?,?,?,?,?,?,?,?,?)
        `).run(
            id,
            colony,
            mobile,
            image,
            latitude,
            longitude,
            category,
            description,
            "Pending"
        );
        logRequest(req, "/report", id);
        res.json({ acknowledgement: id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});
app.get("/reports", (req, res) => {
    const reports = db.prepare(`
        SELECT * FROM reports
    `).all();
    logRequest(req, "/reports");
    res.json(reports);
});
app.get("/report-status/:id", (req, res) => {
    const reportId = req.params.id.trim();
    const report = db.prepare(`
        SELECT * FROM reports
        WHERE id=?
    `).get(reportId);
    if (!report) {
        return res.status(404).json({ error: "Report not found" });
    }
    logRequest(req, "/report-status", reportId);
    res.json(report);
});
app.put("/report/:id", (req, res) => {
    db.prepare(`
        UPDATE reports
        SET status=?
        WHERE id=?
    `).run(req.body.status, req.params.id);
    logRequest(req, "/report-update", req.params.id);
    res.json({ message: "updated" });
});
app.delete("/report/:id", (req, res) => {
    db.prepare(`
        DELETE FROM reports
        WHERE id=?
    `).run(req.params.id);
    logRequest(req, "/report-delete", req.params.id);
    res.json({ message: "deleted" });
});
app.post("/upvote/:id", (req, res) => {
    const ip = req.ip.replace("::ffff:", "");
    const reportId = req.params.id;
    if (checkVoteLimit(ip, reportId)) {
        return res.status(429).json({
            error: "You can only upvote once every 6 hours"
        });
    }
    db.prepare(`
        UPDATE reports
        SET upvotes = upvotes + 1
        WHERE id=?
    `).run(reportId);
    logRequest(req, "/upvote", reportId);
    res.json({ success: true });
});
app.post("/downvote/:id", (req, res) => {
    const reportId = req.params.id;
    db.prepare(`
        UPDATE reports
        SET downvotes = downvotes + 1
        WHERE id=?
    `).run(reportId);
    logRequest(req, "/downvote", reportId);
    res.json({ success: true });
});
app.post("/like/:id", (req, res) => {
    const reportId = req.params.id;
    db.prepare(`
        UPDATE reports
        SET likes = likes + 1
        WHERE id=?
    `).run(reportId);
    logRequest(req, "/like", reportId);
    res.json({ success: true });
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
