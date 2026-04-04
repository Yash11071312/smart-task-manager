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
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;
    const username = document.getElementById("authUsername").value;
    
    if (!email || !password || !username) {
        alert("Please fill in all fields");
        return;
    }

    const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email, password, username })
    });

    const message = await res.json();
    alert(message.message || "Signup completed");
}

async function login() {
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;

    if (!email || !password) {
        alert("Please enter credentials");
        return;
    }

    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email, password })
    });

    if (res.ok) {
        const data = await res.json();
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("username", data.username);
        location.reload();
    } else {
        alert("Login failed");
    }
}
