const API = ""; // Relative paths work best when served from same server

let allTasks = [];
let time = 25 * 60;
let interval = null;

// ================= THEME =================
function toggleTheme() {
document.body.classList.toggle("light-theme");
}

// ================= TIMER =================
function updateTimerDisplay() {
const min = Math.floor(time / 60);
const sec = time % 60;
const el = document.getElementById("timer");
if (el) {
    el.innerText = `${min}:${sec < 10 ? "0" : ""}${sec}`;
}
}

function startTimer() {
    if (interval !== null) return;
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

// ================= CHARTS =================
let pieChart, barChart;

function initCharts() {
    if (pieChart || barChart) return;
    
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const barCtx = document.getElementById('barChart').getContext('2d');
    barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Completed',
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(99, 102, 241, 0.8)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function updateAnalytics() {
    if (!pieChart || !barChart) return;
    const counts = { High: 0, Medium: 0, Low: 0 };
    allTasks.forEach(t => counts[t.priority]++);
    pieChart.data.datasets[0].data = [counts.High, counts.Medium, counts.Low];
    pieChart.update();

    const weeklyData = [0, 0, 0, 0, 0, 0, 0];
    allTasks.filter(t => t.completed).forEach(t => {
        const day = new Date(t.createdAt).getDay();
        const chartIndex = day === 0 ? 6 : day - 1;
        weeklyData[chartIndex]++;
    });
    barChart.data.datasets[0].data = weeklyData;
    barChart.update();

    const total = allTasks.length;
    const completed = allTasks.filter(t => t.completed).length;
    const score = total === 0 ? 0 : Math.round((completed / total) * 100);
    document.getElementById("scoreText").innerText = score;
    document.getElementById("scoreCircle").style.background = 
        `conic-gradient(#10b981 ${score * 3.6}deg, rgba(255, 255, 255, 0.1) 0deg)`;
}

// ================= UI HELPERS =================
function playSound(type) {
    let url = "";
    if (type === "click") url = "https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3";
    if (type === "complete") url = "https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3";
    if (!url) return;
    const audio = new Audio(url);
    audio.volume = 0.4;
    audio.play().catch(() => {});
}

function showToast(message) {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ================= OCR =================
function previewImage(file) {
    const preview = document.getElementById('ocrPreview');
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
}

async function extractText() {
    const fileInput = document.getElementById('ocrUploadInput');
    const status = document.getElementById('ocrStatus');
    if (!fileInput.files[0]) return showToast("Upload image first");
    playSound("click");
    status.innerText = "Extracting...";
    try {
        const result = await Tesseract.recognize(fileInput.files[0], 'eng');
        document.getElementById('timetableInput').value = result.data.text;
        status.innerText = "Done ✅";
        showToast("Text extracted!");
    } catch {
        status.innerText = "Error ❌";
    }
}

// ================= AI PLAN =================
async function generateAIPlan() {
    const text = document.getElementById('timetableInput').value;
    if (!text) return showToast("Add timetable first");
    playSound("click");
    try {
        const res = await fetch(`${API}/generate-plan`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ timetableText: text })
        });
        const data = await res.json();
        const container = document.getElementById("planContent");
        container.innerHTML = data.map(d => `
            <div class="ai-card">
                <b>${d.subject}</b><br>
                ${d.daysLeft} days left<br>
                Study: ${d.hours} hrs/day
            </div>
        `).join("");
        showToast("Plan ready 🎯");
    } catch {
        showToast("API Error ❌");
    }
}

// ================= AUTH =================
async function signup() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    if (!username || !password) return showToast("Enter details");
    playSound("click");
    const res = await fetch(`${API}/signup`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ username, password })
    });
    showToast(await res.text());
}

async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    playSound("click");
    const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ username, password })
    });
    if (res.ok) {
        const data = await res.json();
        document.getElementById("authWrapper").style.display = "none";
        document.getElementById("appSection").style.display = "flex";
        document.getElementById("userGreeting").innerText = `Hi, ${data.username}!`;
        initCharts();
        loadTasks();
        updateTimerDisplay();
    } else {
        showToast(await res.text());
    }
}

// ================= TASKS =================
async function loadTasks() {
    const res = await fetch(`${API}/tasks`);
    allTasks = await res.json();
    renderTasks(allTasks);
    updateDashboard();
}

async function addTask() {
    const text = document.getElementById("taskInput").value;
    const priority = document.getElementById("priorityInput").value;
    const dueDate = document.getElementById("dateInput").value;
    if (!text) return showToast("Empty task");
    playSound("click");
    await fetch(`${API}/add`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ text, priority, dueDate })
    });
    document.getElementById("taskInput").value = "";
    loadTasks();
}

async function toggleTask(id) {
    await fetch(`${API}/toggle/${id}`, { method: "PUT" });
    loadTasks();
}

async function deleteTask(id) {
    await fetch(`${API}/delete/${id}`, { method: "DELETE" });
    loadTasks();
}

function updateDashboard() {
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    document.getElementById("totalCount").innerText = total;
    document.getElementById("doneCount").innerText = completed;
    document.getElementById("progressBar").style.width = percent + "%";
    updateAnalytics();
}

function renderTasks(tasks) {
    const list = document.getElementById("taskList");
    list.innerHTML = "";
    tasks.forEach((t, i) => {
        list.innerHTML += `
        <li>
            <div class="task-main">
                <span class="task-text ${t.completed ? 'completed' : ''}" onclick="toggleTask(${i})">
                    ${t.text}
                </span>
                <button onclick="deleteTask(${i})">❌</button>
            </div>
        </li>`;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    updateTimerDisplay();
});
