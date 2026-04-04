require('dotenv').config();
const express = require("express");
const cron = require('node-cron');
const fs = require('fs');
const authRoutes = require('./authRoutes');
const taskRoutes = require('./taskRoutes');

const app = express();

app.use(express.json());
// Only serve the public folder for frontend assets
app.use(express.static("public"));
// Fallback to serve files from the root directory where index.html is located
app.use(express.static(__dirname));

// Initialize File Storage and Start Cron
startCronJobs();

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Phase 7: Reminder System logic
function startCronJobs() {
    cron.schedule('* * * * *', async () => {
        try {
            if (!fs.existsSync('tasks.json')) return;
            const allTasks = JSON.parse(fs.readFileSync('tasks.json', 'utf8'));
            const now = new Date();
            const inFiveMinutes = new Date(now.getTime() + 5 * 60000);
            
            const tasks = allTasks.filter(t => {
                const taskTime = new Date(t.time);
                return !t.completed && taskTime >= now && taskTime <= inFiveMinutes;
            });

            if (tasks.length > 0) {
                console.log(`⏰ Reminder for ${tasks.length} tasks triggered.`);
            }
        } catch (err) {
            console.error("Cron Job Error:", err);
        }
    });
}

app.get('/api/reminders', async (req, res) => {
    try {
        const userId = req.headers.userid;
        if (!userId || userId === "null" || userId === "undefined") {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!fs.existsSync('tasks.json')) return res.json([]);
        
        const allTasks = JSON.parse(fs.readFileSync('tasks.json', 'utf8'));
        const now = new Date();
        const inFiveMinutes = new Date(now.getTime() + 5 * 60000);
        
        const tasks = allTasks.filter(t => t.userId === userId && !t.completed && new Date(t.time) >= now && new Date(t.time) <= inFiveMinutes);
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