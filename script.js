// ================= GLOBAL =================
const API = "https://smart-task-manager-rdl4.onrender.com"; // ✅ FIXED

let allTasks = [];
let time = 25 * 60;
let interval = null;

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

document.addEventListener("DOMContentLoaded", () => {
    updateTimerDisplay();
});

// ================= SOUND =================
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
    audio.volume = 0.4;

    audio.play().catch(err => console.log("Sound blocked:", err)); // ✅ FIX
}

// ================= TOAST =================
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
        updateTimerDisplay(); // ✅ FIX
    } else {
        showToast(await res.text());
    }
}

async function logout() {
    await fetch(`${API}/logout`, { method: "POST" });

    document.getElementById("appSection").style.display = "none";
    document.getElementById("authWrapper").style.display = "flex";

    showToast("Logged out");
}

// ================= TASKS =================
async function loadTasks() {
    const res = await fetch(`${API}/tasks`);
    allTasks = await res.json();
    renderTasks(allTasks);
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

async function clearAll() {
    await fetch(`${API}/clear`, { method: "DELETE" });
    loadTasks();
}

// ================= RENDER =================
function renderTasks(tasks) {
    const list = document.getElementById("taskList");
    list.innerHTML = "";

    tasks.forEach((t, i) => {
        list.innerHTML += `
        <li>
            <span onclick="toggleTask(${i})">${t.text}</span>
            <button onclick="deleteTask(${i})">❌</button>
        </li>
        `;
    });

    updateCharts(tasks); // ✅ NEW
}

// ================= CHARTS =================
let pieChart, barChart;

function initCharts() {
    const pieCtx = document.getElementById('pieChart').getContext('2d');

    pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: ['High','Medium','Low'],
            datasets: [{
                data: [0,0,0],
                backgroundColor: ['#ef4444','#f59e0b','#10b981']
            }]
        }
    });

    const barCtx = document.getElementById('barChart').getContext('2d');

    barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
            datasets: [{ data: [0,0,0,0,0,0,0] }]
        }
    });
}

// ✅ NEW FUNCTION
function updateCharts(tasks) {
    let high = 0, medium = 0, low = 0;

    tasks.forEach(t => {
        if (t.priority === "High") high++;
        if (t.priority === "Medium") medium++;
        if (t.priority === "Low") low++;
    });

    if (pieChart) {
        pieChart.data.datasets[0].data = [high, medium, low];
        pieChart.update();
    }
}