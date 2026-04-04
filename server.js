require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cron = require('node-cron');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use(express.static("."));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Phase 7: Reminder System logic
const Task = require('./models/Task');
cron.schedule('* * * * *', async () => {
    const now = new Date();
    const inFiveMinutes = new Date(now.getTime() + 5 * 60000);
    const tasks = await Task.find({
        completed: false,
        time: { $gte: now, $lte: inFiveMinutes }
    });
    if (tasks.length > 0) {
        console.log(`⏰ Reminder for ${tasks.length} tasks triggered.`);
    }
});

app.get('/api/reminders', async (req, res) => {
    const userId = req.headers.userid;
    if (!userId) return res.status(401).send("Unauthorized");
    const now = new Date();
    const inFiveMinutes = new Date(now.getTime() + 5 * 60000);
    const tasks = await Task.find({
        userId,
        completed: false,
        time: { $gte: now, $lte: inFiveMinutes }
    });
    res.json(tasks);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("Important: Restart this server whenever you change server.js!");
});