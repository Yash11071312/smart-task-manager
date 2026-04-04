require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cron = require('node-cron');
const authRoutes = require('./authRoutes');
const taskRoutes = require('./taskRoutes');

const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use(express.static("."));

if (!process.env.MONGO_URI) {
    console.error("❌ Error: MONGO_URI is not defined in environment variables.");
    process.exit(1);
}

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
    connectTimeoutMS: 10000,
})
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Phase 7: Reminder System logic
const Task = require('./Task');
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        const inFiveMinutes = new Date(now.getTime() + 5 * 60000);
        const tasks = await Task.find({
            completed: false,
            time: { $gte: now, $lte: inFiveMinutes }
        });
        if (tasks.length > 0) {
            console.log(`⏰ Reminder for ${tasks.length} tasks triggered.`);
        }
    } catch (err) {
        console.error("Cron Job Error:", err);
    }
});

app.get('/api/reminders', async (req, res) => {
    try {
        const userId = req.headers.userid;
        if (!userId || userId === "null" || userId === "undefined") {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const now = new Date();
        const inFiveMinutes = new Date(now.getTime() + 5 * 60000);
        const tasks = await Task.find({
            userId,
            completed: false,
            time: { $gte: now, $lte: inFiveMinutes }
        });
        res.json(tasks);
    } catch (err) {
        console.error("Reminders Route Error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("Important: Restart this server whenever you change server.js!");
});