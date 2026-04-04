// Global state and variables
let allTasks = [];
let loggedInUser = localStorage.getItem("taskUser") || null;
const API = ""; // Use relative path for deployment

let time = 25 * 60;
let interval = null;

function toggleTheme() {
document.body.classList.toggle("light-theme");
}

// ================= TIMER =================
function updateTimerDisplay() {
const min = Math.floor(time / 60);
const sec = time % 60;
const el = document.getElementById("timer");

```
if (el) {
    el.innerText = `${min}:${sec < 10 ? "0" : ""}${sec}`;
}
```

}

function startTimer() {
if (interval) return;

```
playSound("click");

interval = setInterval(() => {
    if (time <= 0) {
        clearInterval(interval);
        interval = null;
        playSound("complete");
        alert("Time's up!");
        return;
    }

    time--;
    updateTimerDisplay();
}, 1000);
```

}

function resetTimer() {
playSound("click");
clearInterval(interval);
interval = null;
time = 25 * 60;
updateTimerDisplay();
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
    updateTimerDisplay();
    if (loggedInUser) checkAuth();
});


// ================= SOUND =================
function playSound(type) {
try {
let url = "";

```
    if (type === "click") {
        url = "https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3";
    }

    if (type === "complete") {
        url = "https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3";
    }

    if (!url) return;

    const audio = new Audio(url);
    audio.volume = 0.3;
    audio.play().catch(() => {});
} catch {}
```

}

// ================= AUTH =================
async function signup() {
const username = document.getElementById("username").value;
const password = document.getElementById("password").value;

```
const res = await fetch(`${API}/signup`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ username, password })
});

alert(await res.text());
```

}

async function login() {
const username = document.getElementById("username").value;
const password = document.getElementById("password").value;

```
const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ username, password })
});

if (res.ok) {
    const data = await res.json();
    // Save session to localStorage so it persists on refresh
    localStorage.setItem("taskUser", data.username);

    document.getElementById("authWrapper").style.display = "none";
    document.getElementById("appSection").style.display = "flex";

    document.getElementById("userGreeting").innerText = `Hi, ${data.username}!`;
    if (typeof loadTasks === "function") loadTasks();
} else {
    alert("Login failed");
}
```

}
