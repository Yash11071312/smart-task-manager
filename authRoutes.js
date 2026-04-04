const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fs = require('fs');

const USERS_FILE = 'users.json';

const getUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
};

const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: "Username and password required" });
        
        const users = getUsers();
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ message: "Username already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { _id: Date.now().toString(), username, password: hashedPassword };
        users.push(newUser);
        saveUsers(users);
        
        res.json({ message: "User registered successfully" });
    } catch (err) {
        res.status(400).json({ message: "Signup failed." });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = getUsers();
        const user = users.find(u => u.username === username);
        
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