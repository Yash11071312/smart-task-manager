const express = require("express");
const app = express();

// Middleware to parse JSON bodies from the frontend
app.use(express.json());
// Serve static files (HTML, CSS, JS) from the 'public' folder
app.use(express.static("public"));

// In-memory storage (Resets when server restarts)
let users = []; // Array to store user objects: { username, password, tasks: [] }
let currentUser = null; // Variable to track the currently logged-in user
// Note: In a real app, use sessions or JWT to support multiple concurrent users.

// --- Auth Routes ---

// Register a new user
app.post("/signup", (req, res) => {
  console.log("Signup attempt for:", req.body.username);
  const { username, password } = req.body;

  if (!username || !password) return res.status(400).send("Username and password required");

  if (users.find(u => u.username === username)) {
    return res.status(400).send("User already exists");
  }

  // Store user with an empty tasks array
  users.push({ username, password, tasks: [] });
  res.send("User registered successfully");
});

// Login user
app.post("/login", (req, res) => {
  console.log("Login attempt for:", req.body.username);
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    return res.status(401).send("Invalid username or password");
  }
  
  currentUser = user; // Set the global currentUser to the found user
  res.json({ username: user.username }); // Return user data for the UI
});

// Logout user
app.post("/logout", (req, res) => {
  currentUser = null;
  res.send("Logged out");
});

// --- AI Study Plan Routes ---

// Helper function to parse timetable text (moved from frontend)
function parseTimetable(text) {
  const lines = text.split('\n');
  const schedule = [];
  const dateRegex = /\d{4}-\d{2}-\d{2}/; // YYYY-MM-DD format

  lines.forEach(line => {
    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      const subject = line.replace(dateMatch[0], '').trim() || "Subject";
      schedule.push({ subject, date: dateMatch[0] });
    }
  });
  return schedule;
}

// Helper function to optimize study plan (moved from frontend)
function optimizePlan(schedule) {
  const today = new Date();
  return schedule.map(item => {
    const examDate = new Date(item.date);
    const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    
    let priority = "Medium";
    let hours = 2;
    if (daysLeft < 7) { priority = "High"; hours = 4; }
    if (daysLeft < 3) { hours = 6; }

    return { ...item, daysLeft, priority, hours };
  }).sort((a, b) => a.daysLeft - b.daysLeft);
}

// Generate AI Study Plan
app.post("/generate-plan", (req, res) => {
  if (!currentUser) return res.status(401).send("Unauthorized: Please login first");
  const { timetableText } = req.body;

  if (!timetableText) return res.status(400).send("Timetable text is required.");

  const schedule = parseTimetable(timetableText);
  if (schedule.length === 0) return res.status(400).send("No valid dates found in timetable. Use YYYY-MM-DD format.");

  const optimizedPlan = optimizePlan(schedule);
  res.json(optimizedPlan); // Send the optimized plan back
});

// --- Task Routes ---

// Get tasks for the logged-in user only
app.get("/tasks", (req, res) => {
  if (!currentUser) return res.status(401).send("Unauthorized: Please login first");
  res.json(currentUser.tasks);
});

// Add task to the current user's list
app.post("/add", (req, res) => {
  if (!currentUser) return res.status(401).send("Unauthorized: Please login first");
  const { text, priority, dueDate } = req.body;
  if (!text) return res.status(400).send("Task text is required");

  currentUser.tasks.push({ 
    text, 
    priority: priority || 'Medium', 
    dueDate: dueDate || 'No Date',
    completed: false,
    createdAt: new Date()
  });
  res.send("Task added");
});

// Toggle task status
app.put("/toggle/:id", (req, res) => {
  if (!currentUser) return res.status(401).send("Unauthorized");
  const task = currentUser.tasks[req.params.id];
  if (task) task.completed = !task.completed;
  res.send("Toggled");
});

// Update task details
app.put("/update/:id", (req, res) => {
  if (!currentUser) return res.status(401).send("Unauthorized");
  const { text, priority, dueDate } = req.body;
  if (currentUser.tasks[req.params.id]) {
    currentUser.tasks[req.params.id] = { 
      ...currentUser.tasks[req.params.id], 
      text, priority, dueDate 
    };
    res.send("Updated");
  } else {
    res.status(404).send("Task not found");
  }
});

// Mark task as complete
app.patch("/complete/:id", (req, res) => {
  if (!currentUser) return res.status(401).send("Unauthorized");
  if (currentUser.tasks[req.params.id]) {
    currentUser.tasks[req.params.id].completed = true;
    res.send("Completed");
  } else {
    res.status(404).send("Task not found");
  }
});

// Delete task from the current user's list by index
app.delete("/delete/:id", (req, res) => {
  if (!currentUser) return res.status(401).send("Unauthorized: Please login first");
  currentUser.tasks.splice(req.params.id, 1);
  res.send("Deleted");
});

// Clear all tasks for current user
app.delete("/clear", (req, res) => {
  if (!currentUser) return res.status(401).send("Unauthorized");
  currentUser.tasks = [];
  res.send("Cleared");
});

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
  console.log("Important: Restart this server whenever you change server.js!");
});