const express = require('express');
const router = express.Router();
const fs = require('fs');

const TASKS_FILE = 'tasks.json';

const getTasks = () => {
    if (!fs.existsSync(TASKS_FILE)) return [];
    return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
};

const saveTasks = (tasks) => {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
};

router.get('/', async (req, res) => {
    try {
        const userId = req.headers.userid;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        
        const tasks = getTasks().filter(t => t.userId === userId);
        tasks.sort((a, b) => new Date(a.time) - new Date(b.time));
        res.json(tasks);
    } catch (err) {
        console.error("Fetch Tasks Error:", err);
        res.status(500).json({ message: "Failed to fetch tasks" });
    }
});

router.post('/add', async (req, res) => {
    try {
        const { userId, text, description, time, priority } = req.body;
        const tasks = getTasks();
        const newTask = {
            _id: Date.now().toString(),
            userId, text, description, time, 
            priority: priority || 'Medium', 
            completed: false,
            createdAt: new Date()
        };
        tasks.push(newTask);
        saveTasks(tasks);
        res.json({ success: true, message: "Task added" });
    } catch (err) {
        res.status(400).json({ error: "Could not add task" });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const tasks = getTasks();
        const index = tasks.findIndex(t => t._id === req.params.id);
        if (index === -1) return res.status(404).send("Task not found");
        
        tasks[index].completed = !tasks[index].completed;
        saveTasks(tasks);
        res.json({ success: true });
    } catch (err) {
        res.status(400).send("Error updating task");
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const tasks = getTasks();
        const filtered = tasks.filter(t => t._id !== req.params.id);
        saveTasks(filtered);
        res.json({ success: true, message: "Task deleted" });
    } catch (err) {
        res.status(400).send("Error deleting task");
    }
});

module.exports = router;