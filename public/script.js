let allTasks = [];
let userId = localStorage.getItem("userId") || null;
let username = localStorage.getItem("username") || null;
let loggedInUser = localStorage.getItem("taskUser") || null; // Support existing keys
const API = "";

let pieChart, barChart;
let time = 25 * 60;
let interval = null;

document.addEventListener("DOMContentLoaded", () => {
    updateTimerDisplay();
    checkAuth();
});

function switchView(viewId) {
    // Hide all views
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('active-view');
    });
    // Show target view
    document.getElementById(viewId).classList.add('active-view');
    
    // Update Nav UI
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('onclick')?.includes(viewId)) item.classList.add('active');
    });

    if (viewId === 'analyticsView') initCharts();
}

async function signup() {
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;
    const username = document.getElementById("authUsername").value;
    if (!email || !password || !username) return showToast("Please fill all fields");
    const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username })
    });
    showToast(await res.text());
}

async function login() {
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;
    if (!email || !password) return showToast("Please enter credentials");
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    if (res.ok) {
        const data = await res.json();
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("username", data.username);
        localStorage.setItem("taskUser", data.username);
        userId = data.userId;
        username = data.username;
        loggedInUser = data.username;
        showApp();
    } else showToast("Login failed");
}

function showApp() {
    document.getElementById("authWrapper").style.display = "none";
    document.getElementById("appSection").style.display = "block";
    document.getElementById("userGreeting").innerText = `Hi, ${username}`;
    initCharts();
    loadTasks();
}

async function loadTasks() {
    const res = await fetch("/api/tasks", { headers: { userId } });
    allTasks = await res.json();
    renderTasks();
}

async function addTask() {
    const text = document.getElementById("taskInput").value;
    const priority = document.getElementById("priorityInput").value;
    const time = document.getElementById("dateInput").value;
    
    if (!text || !time) return showToast("Please enter task and date");

    await fetch("/api/tasks/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, text, time, priority })
    });
    loadTasks();
}

// Function to restore session on page load
function checkAuth() {
    if (userId || loggedInUser) {
        username = username || loggedInUser;
        showApp();
        if (Notification.permission !== "granted") Notification.requestPermission();
        setInterval(checkReminders, 60000);
    }
}

function logout() {
    localStorage.clear();
    location.reload();
}

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

function updateDashboard() {
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    document.getElementById("totalCount").innerText = total;
    document.getElementById("doneCount").innerText = completed;
    document.getElementById("progressBar").style.width = percent + "%";
    updateAnalytics(); // Refresh charts
}

async function toggleTask(id) {
    await fetch(`/api/tasks/${id}`, { method: "PUT" });
    loadTasks();
}

async function deleteTask(id) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    loadTasks();
}

async function clearAll() {
    if (confirm("Are you sure you want to clear all tasks?")) {
        // This requires an endpoint to delete many tasks for the current user
        showToast("Feature coming soon!");
    }
}

async function checkReminders() {
    const res = await fetch("/api/reminders", { headers: { userId } });
    if (res.ok) {
        const tasks = await res.json();
        tasks.forEach(t => {
            if (Notification.permission === "granted") {
                new Notification("Task Reminder", { body: t.text });
            }
        });
    }
}

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
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function toggleTheme() {
    document.body.classList.toggle("light-theme");
}