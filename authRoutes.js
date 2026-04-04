const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('./User');

router.post('/signup', async (req, res) => {
    try {
        const { email, password, username } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, username, password: hashedPassword });
        await newUser.save();
        res.json({ message: "User registered successfully" });
    } catch (err) {
        res.status(400).send("User registration failed");
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
        res.json({ userId: user._id, username: user.username });
    } else {
        res.status(401).send("Invalid credentials");
    }
});

module.exports = router;