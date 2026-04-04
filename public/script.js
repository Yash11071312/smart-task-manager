    // Global state and variables
    let allTasks = [];
    // Store the logged in user locally to prevent session collision on deployment
    let loggedInUser = localStorage.getItem("taskUser") || null;
    const API = ""; // Empty string for relative paths during deployment

    // Timer variables
    let time = 25 * 60;
    let interval = null;
    // ================= TIMER FIX =================

// Timer Display Update
function updateTimerDisplay() {
    const min = Math.floor(time / 60);
    const sec = time % 60;

    const el = document.getElementById("timer");
    if (el) {
        el.innerText = `${min}:${sec < 10 ? "0" : ""}${sec}`;
    }
}

// Start Timer
function startTimer() {
    playSound("click");

    if (interval !== null) return; // prevent multiple timers

    interval = setInterval(() => {
        if (time <= 0) {
            clearInterval(interval);
            interval = null;

            playSound("complete");
            showToast("⏰ Time's up!");
            return;
        }

        time--;
        updateTimerDisplay();
    }, 1000);
}

// Reset Timer
function resetTimer() {
    playSound("click");

    clearInterval(interval);
    interval = null;

    time = 25 * 60;
    updateTimerDisplay();
}

// Function to restore session on page load
function checkAuth() {
    if (loggedInUser) {
        document.getElementById("userGreeting").innerText = `Hi, ${loggedInUser}!`;
        document.getElementById("authWrapper").style.display = "none";
        document.getElementById("appSection").classList.add('page');
        document.getElementById("appSection").style.display = "flex";
        initCharts();
        loadTasks();
    }
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
    updateTimerDisplay();
    checkAuth();
});

    // Chart Variables
    let pieChart, barChart;

    // Initialize Charts
    function initCharts() {
    if (pieChart || barChart) return; // Prevent double initialization
    
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
        labels: ['High', 'Medium', 'Low'],
        datasets: [{
            data: [0, 0, 0],
            backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
            borderWidth: 0,
            hoverOffset: 15
        }]
        },
        options: {
        plugins: { legend: { display: true, position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12 } } },
        cutout: '70%', // Donut style
        animation: { animateScale: true, animateRotate: true }, // Smooth animation
        responsive: true,
        maintainAspectRatio: false
        }
    });

    const barCtx = document.getElementById('barChart').getContext('2d');
    barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            label: 'Completed',
            data: [0, 0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderRadius: 6
        }]
        },
        options: { // Chart.js options for responsiveness and styling
        animation: { duration: 1000, easing: 'easeOutQuart' }, // Smooth animation
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, grid: { display: false }, ticks: { color: '#94a3b8', stepSize: 1 } },
            x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        },
        responsive: true,
        maintainAspectRatio: false
        },
    });
    }

    function updateAnalytics() {
    if (!pieChart || !barChart) return;

    // 1. Update Priority Pie
    const counts = { High: 0, Medium: 0, Low: 0 };
    allTasks.forEach(t => counts[t.priority]++);
    pieChart.data.datasets[0].data = [counts.High, counts.Medium, counts.Low];
    pieChart.update();

    // 2. Update Weekly Bar (Group by Day)
    const weeklyData = [0, 0, 0, 0, 0, 0, 0];
    allTasks.filter(t => t.completed).forEach(t => {
        const day = new Date(t.createdAt).getDay();
        const chartIndex = day === 0 ? 6 : day - 1; // Map Sun(0) to index 6
        weeklyData[chartIndex]++;
    });
    barChart.data.datasets[0].data = weeklyData;
    barChart.update();

    // 3. Update Score Circle
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.completed).length;
    const score = total === 0 ? 0 : Math.round((completed / total) * 100);
    document.getElementById("scoreText").innerText = score;
    document.getElementById("scoreCircle").style.background = 
        `conic-gradient(#10b981 ${score * 3.6}deg, rgba(255, 255, 255, 0.1) 0deg)`;

    // 4. Update Insights
    document.getElementById("pendingCount").innerText = allTasks.filter(t => !t.completed).length;
    document.getElementById("deadlineCount").innerText = allTasks.filter(t => t.dueDate && t.dueDate !== 'No Date').length;
    }

    // --- Study Companion Logic ---

    // Part 3: OCR Image Preview and Drag & Drop
    const ocrDropZone = document.getElementById('ocrDropZone');
    const ocrUploadInput = document.getElementById('ocrUploadInput');

    // Handle click on drop zone
    ocrDropZone.addEventListener('click', () => ocrUploadInput.click());

    // Handle file selection from input
    ocrUploadInput.addEventListener('change', (event) => {
    if (event.target.files.length > 0) {
        previewImage(event.target.files[0]);
    }
    });

    // Handle drag & drop events
    ocrDropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    ocrDropZone.style.borderColor = '#6366f1'; // Highlight on drag over
    });

    ocrDropZone.addEventListener('dragleave', (event) => {
    event.preventDefault();
    ocrDropZone.style.borderColor = 'rgba(255,255,255,0.2)'; // Reset border
    });

    ocrDropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    ocrDropZone.style.borderColor = 'rgba(255,255,255,0.2)'; // Reset border
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        ocrUploadInput.files = files; // Assign dropped files to input
        previewImage(files[0]);
    }
    });

    // Helper to show image preview
    function previewImage(file) { // Changed event to file
    const preview = document.getElementById('ocrPreview');
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
    }


    // Part 3: Extract Text using OCR (Tesseract.js)
    async function extractText() {
    const fileInput = document.getElementById('ocrUploadInput');
    const status = document.getElementById('ocrStatus');
    const ocrBtn = document.getElementById('ocrBtn');

    if (!fileInput.files[0]) return showToast("Please upload an image");
    playSound("click");

    ocrBtn.disabled = true;
    ocrBtn.innerText = "Extracting...";
    status.innerText = "🌀 Extracting text... please wait";
    status.classList.add('loading-spinner'); // Add spinner

    try {
        const result = await Tesseract.recognize(fileInput.files[0], 'eng', {
            logger: m => console.log(m)
        });
        document.getElementById('timetableInput').value = result.data.text;
        status.innerText = "✅ Extraction complete!";
        showToast("Text extracted successfully");
    } catch (error) {
        status.innerText = "❌ OCR Error";
        console.error(error);
    } finally {
        ocrBtn.disabled = false;
        status.classList.remove('loading-spinner'); 
    }
    }

    // Part 4: Parse Timetable (Frontend parsing for now)
    function parseTimetable(text) {
    // More robust parser: Looks for subjects and dates (YYYY-MM-DD)
    // This can be enhanced with more complex regex for various date formats
    const lines = text.split('\n');
    const schedule = [];
    const dateRegex = /\d{4}-\d{2}-\d{2}/;

    lines.forEach(line => {
        const dateMatch = line.match(dateRegex);
        if (dateMatch) {
        const subject = line.replace(dateMatch[0], '').trim() || "Subject";
        schedule.push({ subject, date: dateMatch[0] });
        }
    });
    return schedule;
    }

    // Part 5: Optimize Plan (Frontend optimization for now)
    function optimizePlan(schedule) {
    const today = new Date();
    return schedule.map(item => {
        const examDate = new Date(item.date);
        const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
        
        // Optimization logic: Closer dates get higher priority
        let priority = "Medium";
        let hours = 2;
        if (daysLeft < 7) { priority = "High"; hours = 4; }
        if (daysLeft < 3) { hours = 6; }

        return { ...item, daysLeft, priority, hours };
    }).sort((a, b) => a.daysLeft - b.daysLeft);
    }

    // Part 6: AI Plan Generator (Now calls backend)
    async function generateAIPlan() {
    const text = document.getElementById('timetableInput').value;
    const generatePlanBtn = document.getElementById('generatePlanBtn');
    if (!text) return showToast("Paste or Extract text first!");

    generatePlanBtn.disabled = true;
    playSound("click");
    generatePlanBtn.innerText = "Generating Plan...";
    showToast("Generating AI Study Plan...");

    const output = document.getElementById('aiPlanOutput');
    const content = document.getElementById('planContent');

    try {
        const res = await fetch(`${API}/generate-plan`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "user": loggedInUser // Identify user
        },
        body: JSON.stringify({ timetableText: text })
        });

        if (!res.ok) throw new Error(await res.text());

        const planData = await res.json();

        // Construct the HTML string for the plan
        const planHtml = planData.map(item => `
        <div class="ai-day-card" style="border-left: 4px solid ${item.priority === 'High' ? '#ef4444' : '#10b981'}; padding-left: 10px; margin-bottom: 10px;">
            <strong>${item.subject}</strong> <br/>
            <small>Exam in: ${item.daysLeft} days | Study: ${item.hours}h daily</small>
        </div>
        `).join('') + `<div style="margin-top: 10px; font-size: 0.75rem; opacity: 0.8;">💡 Includes revision & 1 buffer day.</div>`;

        output.style.display = "block";
        content.innerHTML = planHtml; // Fixed: set HTML directly to avoid typing raw tags

        showToast("AI Study Plan Generated! 🎯");
    } catch (error) {
        showToast(`Error generating plan: ${error.message}`);
        console.error("AI Plan Error:", error);
    } finally {
        generatePlanBtn.disabled = false;
        generatePlanBtn.innerText = "✨ Generate AI Plan";
        playSound("click");
    }
    }

    function playSound(type) {
        let url = "";

        if (type === "click") {
            url = "https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3";
        }

        if (type === "complete") {
            url = "https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3";
        }

        if (!url) return;

        const audio = new Audio(url);
        audio.volume = 0.5;

        audio.play().catch(err => console.log("Sound blocked:", err));
    }

    // Notification System
    function showToast(message) {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
    }

    // Authentication logic
    async function signup() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (!username || !password) return showToast("Please enter credentials");
    playSound("click");

    const res = await fetch(`${API}/signup`, {
        // Part 4: Sound Feedback
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const message = await res.text();
    showToast(message);
    }

    async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (!username || !password) return showToast("Please enter credentials");
    playSound("click");

    const res = await fetch(`${API}/login`, {
        // Part 4: Sound Feedback
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    if (res.ok) {
        playSound("click");
        const data = await res.json();
        loggedInUser = data.username;
        localStorage.setItem("taskUser", loggedInUser);
        document.getElementById("userGreeting").innerText = `Hi, ${data.username}!`;
        
        document.getElementById("authWrapper").style.display = "none";
        document.getElementById("appSection").classList.add('page');
        document.getElementById("appSection").style.display = "flex"; // Maintain 3-panel grid
        initCharts();
        loadTasks(); // Load tasks after login
    } else {
        const error = await res.text();
        showToast(error);
    }
    }

    async function logout() {
    await fetch(`${API}/logout`, { method: "POST" });
    playSound("click");
    loggedInUser = null;
    localStorage.removeItem("taskUser");
    allTasks = [];
    document.getElementById("taskList").innerHTML = "";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";

    document.getElementById("appSection").style.display = "none";
    document.getElementById("authWrapper").style.display = "flex"; // Restore flex wrapper
    showToast("Logged out");
    }

    // Dashboard & Rendering
    function updateDashboard() {
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    document.getElementById("totalCount").innerText = total;
    document.getElementById("doneCount").innerText = completed;
    document.getElementById("progressBar").style.width = percent + "%";
    updateAnalytics(); // Refresh charts
    }

    function renderTasks(tasksToRender) {
    let list = document.getElementById("taskList");
    list.innerHTML = "";

    if (tasksToRender.length === 0) {
        list.innerHTML = `<p style="opacity:0.5; margin-top:20px;">No tasks found.</p>`;
    }

    tasksToRender.forEach((task) => {
        const originalIndex = allTasks.indexOf(task);
        list.innerHTML += `
        <li>
            <div class="task-main">
            <span class="task-text ${task.completed ? 'completed' : ''}" onclick="toggleTask(${originalIndex})">
                ${task.text}
            </span>
            <div class="action-btns">
                <button class="edit-btn" onclick="toggleTask(${originalIndex})" title="Mark complete">✔</button>
                <button class="edit-btn" onclick="editTask(${originalIndex})">✏️</button>
                <button class="delete-btn" onclick="deleteTask(${originalIndex})">🗑️</button>
            </div>
            </div>
            <div class="task-info">
            <span class="badge ${task.priority}">${task.priority}</span>
            <span>📅 ${task.dueDate || 'No date'}</span>
            </div>
        </li>
        `;
    });
    updateDashboard();
    }

    function filterTasks() {
    const query = document.getElementById("searchInput").value.toLowerCase();
    const type = document.getElementById("filterType").value;

    let filtered = allTasks.filter(t => {
        const matchesSearch = t.text.toLowerCase().includes(query);
        const matchesType = type === 'all' || 
                            (type === 'completed' && t.completed) || 
                            (type === 'pending' && !t.completed);
        return matchesSearch && matchesType;
    });

    renderTasks(filtered);
    }

    // Task logic
    async function loadTasks() {
    if (!loggedInUser) return;
    let res = await fetch(`${API}/tasks`, {
        headers: { "user": loggedInUser }
    });
    
    if (!res.ok) {
        if (res.status === 401) {
            logout(); // Auto-logout if session is invalid on server
        }
        return;
    }

    allTasks = await res.json();
    filterTasks();
    }

    async function addTask() {
    const text = document.getElementById("taskInput").value;
    const priority = document.getElementById("priorityInput").value;
    const dueDate = document.getElementById("dateInput").value;

    if (!text) return showToast("Task cannot be empty");
    playSound("click");

    await fetch(`${API}/add`, {
        // Part 4: Sound Feedback
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "user": loggedInUser
        },
        body: JSON.stringify({ text, priority, dueDate })
    });

    document.getElementById("taskInput").value = "";
    showToast("Task added");
    loadTasks();
    }

    async function toggleTask(id) {
    await fetch(`${API}/toggle/` + id, { 
        method: "PUT",
        headers: { "user": loggedInUser }
    });
    loadTasks();
    }

    async function editTask(id) {
    const task = allTasks[id];
    const newText = prompt("Edit task text:", task.text);
    if (newText === null) return;

    playSound("click");
    await fetch(`${API}/update/` + id, {
        method: "PUT",
        headers: { 
            "Content-Type": "application/json",
            "user": loggedInUser
        },
        body: JSON.stringify({ 
        text: newText, 
        priority: task.priority, 
        dueDate: task.dueDate 
        })
    });
    showToast("Task updated");
    loadTasks();
    }

    async function clearAll() {
    if (confirm("Clear all tasks?")) {
        await fetch(`${API}/clear`, { 
            method: "DELETE",
            headers: { "user": loggedInUser }
        });
        playSound("click");
        showToast("Cleared all tasks");
        loadTasks();
    }
    }

    async function deleteTask(id) {
    // Send the index (ID) to the delete endpoint
    await fetch(`${API}/delete/` + id, {
        // Part 4: Sound Feedback
        method: "DELETE",
        headers: { "user": loggedInUser }
    });

    showToast("Task deleted");
    loadTasks();
    }

    function toggleTheme() {
    document.body.classList.toggle("light-theme");
    }