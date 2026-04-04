const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    description: { type: String },
    time: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    priority: { type: String, default: 'Medium' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);