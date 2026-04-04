const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('./User');

router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: "Username and password required" });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.json({ message: "User registered successfully" });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "Username already exists." });
        }
        res.status(400).json({ message: "Signup failed." });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            res.json({ userId: user._id, username: user.username });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Internal server error during login" });
    }
});

module.exports = router;