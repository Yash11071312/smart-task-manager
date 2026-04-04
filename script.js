// Global state and variables
let allTasks = [];
let userId = localStorage.getItem("userId") || null;
let username = localStorage.getItem("username") || null;
const API = "";

let time = 25 * 60;
let interval = null;
let pieChart, barChart;

function toggleTheme() {
    document.body.classList.toggle("light-theme");
}

// ================= AUTH =================
async function signup() {
    const usernameVal = document.getElementById("authUsername")?.value;
    const password = document.getElementById("authPassword")?.value;
    
    if (!usernameVal || !password) {
        showToast("Please fill in all fields");
        return;
    }

    try {
        const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ username: usernameVal, password })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message || "Signup successful! You can now login.");
        } else {
            showToast(data.message || "Signup failed");
        }
    } catch (err) {
        showToast("Signup failed");
    }
}

async function login() {
    const usernameVal = document.getElementById("authUsername")?.value;
    const password = document.getElementById("authPassword")?.value;

    if (!usernameVal || !password) {
        showToast("Please enter credentials");
        return;
    }

    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ username: usernameVal, password })
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem("userId", data.userId);
            localStorage.setItem("username", data.username);
            location.reload();
        } else {
            showToast("Login failed");
        }
    } catch (err) {
        showToast("Login error");
    }
}

function checkAuth() {
    if (userId) {
        showApp();
        if (Notification.permission !== "granted") Notification.requestPermission();
        setInterval(checkReminders, 60000);
    }
}

function showApp() {
    document.getElementById("authWrapper").style.display = "none";
    document.getElementById("appSection").style.display = "block";
    document.getElementById("userGreeting").innerText = `Hi, ${username}`;
    initCharts();
    loadTasks();
}

function logout() {
    localStorage.clear();
    location.reload();
}

// ================= TIMER =================
function updateTimerDisplay() {
    const min = Math.floor(time / 60);
    const sec = time % 60;
    const el = document.getElementById("timer");
    if (el) el.innerText = `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

function startTimer() {
    if (interval) return;
    playSound("click");
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

function resetTimer() {
    playSound("click");
    clearInterval(interval);
    interval = null;
    time = 25 * 60;
    updateTimerDisplay();
}

// ================= TASKS =================
async function loadTasks() {
    const res = await fetch("/api/tasks", { headers: { userId } });
    allTasks = await res.json();
    renderTasks();
}

async function addTask() {
    const text = document.getElementById("taskInput").value;
    const priority = document.getElementById("priorityInput").value;
    const timeVal = document.getElementById("dateInput").value;
    
    if (!text || !timeVal) return showToast("Please enter task and date");

    await fetch("/api/tasks/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, text, time: timeVal, priority })
    });
    document.getElementById("taskInput").value = "";
    loadTasks();
}

async function toggleTask(id) {
    await fetch(`/api/tasks/${id}`, { method: "PUT" });
    loadTasks();
}

async function deleteTask(id) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    loadTasks();
}

function renderTasks() {
    const list = document.getElementById("taskList");
    list.innerHTML = allTasks.map(t => `
        <li class="${t.completed ? 'completed' : ''}">
            <div class="task-main">
                <span class="task-text" onclick="toggleTask('${t._id}')">${t.text}</span>
                <div class="action-btns">
                    <button class="delete-btn" onclick="deleteTask('${t._id}')">🗑️</button>
                </div>
            </div>
            <div class="task-info">
                <span class="badge ${t.priority}">${t.priority}</span>
                <span>📅 ${new Date(t.time).toLocaleDateString()}</span>
            </div>
        </li>`).join('');
    updateDashboard();
}

function updateDashboard() {
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    document.getElementById("totalCount").innerText = total;
    document.getElementById("doneCount").innerText = completed;
    document.getElementById("progressBar").style.width = percent + "%";
    if (document.getElementById('analyticsView').classList.contains('active-view')) updateAnalytics();
}

document.addEventListener("DOMContentLoaded", () => {
    updateTimerDisplay();
    checkAuth();
});

// ================= SOUND =================
function playSound(type) {
    let url = type === "click" 
        ? "https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3"
        : "https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3";
    const audio = new Audio(url);
    audio.volume = 0.3;
    audio.play().catch(() => {});
}

function showToast(msg) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ================= NAVIGATION & VIEWS =================
function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(view => view.classList.remove('active-view'));
    document.getElementById(viewId).classList.add('active-view');
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('onclick')?.includes(viewId)) item.classList.add('active');
    });
    if (viewId === 'analyticsView') updateAnalytics();
}

// ================= ANALYTICS =================
function initCharts() {
    if (pieChart || !document.getElementById('pieChart')) return;
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: { labels: ['High', 'Medium', 'Low'], datasets: [{ data: [0,0,0], backgroundColor: ['#ef4444', '#f59e0b', '#10b981'] }] },
        options: { plugins: { legend: { display: false } }, cutout: '70%', responsive: true, maintainAspectRatio: false }
    });
    const barCtx = document.getElementById('barChart').getContext('2d');
    barChart = new Chart(barCtx, {
        type: 'bar',
        data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: [{ data: [0,0,0,0,0,0,0], backgroundColor: '#6366f1' }] },
        options: { plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }
    });
}

function updateAnalytics() {
    if (!pieChart) initCharts();
    const counts = { High: 0, Medium: 0, Low: 0 };
    allTasks.forEach(t => counts[t.priority]++);
    pieChart.data.datasets[0].data = [counts.High, counts.Medium, counts.Low];
    pieChart.update();
    
    const score = allTasks.length ? Math.round((allTasks.filter(t => t.completed).length / allTasks.length) * 100) : 0;
    document.getElementById("scoreText").innerText = score;
    document.getElementById("scoreCircle").style.background = `conic-gradient(#10b981 ${score * 3.6}deg, rgba(255, 255, 255, 0.1) 0deg)`;
}

// ================= MISC =================
function generatePlan() {
    const subjects = document.getElementById("subjectsInput").value.split(',');
    const examDate = new Date(document.getElementById("examDateInput").value);
    const days = Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24));
    const output = document.getElementById("studyPlanOutput");
    if (output) output.innerHTML = `<h3>Plan for ${days} days:</h3>` + subjects.map(s => `<p>${s.trim()}: ${Math.round(days/subjects.length)} sessions</p>`).join('');
}

async function checkReminders() {
    const res = await fetch("/api/reminders", { headers: { userid: userId } });
    if (res.ok) {
        const tasks = await res.json();
        tasks.forEach(t => { if (Notification.permission === "granted") new Notification("Task Reminder", { body: t.text }); });
    }
}

async function extractText() {
    const ocrBtn = document.getElementById('ocrBtn');
    const fileInput = document.getElementById('ocrUploadInput');
    if (!fileInput.files[0]) return showToast("Upload an image first");
    ocrBtn.innerText = "Extracting...";
    try {
        const result = await Tesseract.recognize(fileInput.files[0], 'eng');
        document.getElementById('timetableInput').value = result.data.text;
        showToast("Text extracted!");
    } catch (e) { showToast("OCR failed"); }
    finally { ocrBtn.innerText = "Extract Text"; }
}
