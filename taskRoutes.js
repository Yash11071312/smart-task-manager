const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

router.get('/', async (req, res) => {
    const userId = req.headers.userid;
    if (!userId) return res.status(401).send("Unauthorized");
    const tasks = await Task.find({ userId }).sort({ time: 1 });
    res.json(tasks);
});

router.post('/add', async (req, res) => {
    const { userId, text, description, time, priority } = req.body;
    try {
        const newTask = new Task({ userId, text, description, time, priority });
        await newTask.save();
        res.json({ success: true, message: "Task added" });
    } catch (err) {
        res.status(400).json({ error: "Could not add task" });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (task) {
            task.completed = !task.completed;
            await task.save();
            res.json({ success: true });
        } else {
            res.status(404).send("Task not found");
        }
    } catch (err) {
        res.status(400).send("Error updating task");
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Task deleted" });
    } catch (err) {
        res.status(400).send("Error deleting task");
    }
});

module.exports = router;