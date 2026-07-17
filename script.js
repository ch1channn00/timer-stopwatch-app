const appTitle = document.querySelector("#app-title");
const timeDisplay = document.querySelector("#timeDisplay");
const ringProgress = document.querySelector("#ringProgress");
const statusText = document.querySelector("#statusText");
const startPauseButton = document.querySelector("#startPauseButton");
const resetButton = document.querySelector("#resetButton");
const lapButton = document.querySelector("#lapButton");
const customTimeForm = document.querySelector("#customTimeForm");
const minutesInput = document.querySelector("#minutesInput");
const secondsInput = document.querySelector("#secondsInput");
const presetButtons = document.querySelectorAll(".preset");
const modeTabs = document.querySelectorAll(".mode-tab");
const timerSettings = document.querySelector("#timerSettings");
const controlRow = document.querySelector(".control-row");
const lapList = document.querySelector("#lapList");

const radius = 106;
const circumference = 2 * Math.PI * radius;

let mode = "timer";
let intervalId = null;

let timerTotalMs = 25 * 60 * 1000;
let timerRemainingMs = timerTotalMs;
let timerEndsAt = 0;

let stopwatchElapsedMs = 0;
let stopwatchStartedAt = 0;
let lapCount = 0;

document.body.dataset.mode = mode;
ringProgress.style.strokeDasharray = `${circumference}`;

function formatTimer(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatStopwatch(ms) {
  const safeMs = Math.max(0, ms);
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const centiseconds = Math.floor((safeMs % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function setStatus(text, state = "") {
  statusText.textContent = text;
  statusText.className = `status ${state}`.trim();
}

function setRingRatio(ratio) {
  const clampedRatio = Math.min(1, Math.max(0, ratio));
  ringProgress.style.strokeDashoffset = `${circumference * (1 - clampedRatio)}`;
}

function stopInterval() {
  clearInterval(intervalId);
  intervalId = null;
}

function isRunning() {
  return intervalId !== null;
}

function renderTimer() {
  timeDisplay.textContent = formatTimer(timerRemainingMs);
  setRingRatio(timerTotalMs > 0 ? timerRemainingMs / timerTotalMs : 0);
}

function renderStopwatch() {
  const elapsed = isRunning() && mode === "stopwatch"
    ? stopwatchElapsedMs + Date.now() - stopwatchStartedAt
    : stopwatchElapsedMs;

  timeDisplay.textContent = formatStopwatch(elapsed);
  setRingRatio((elapsed % 60000) / 60000);
}

function playDoneSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.5);
}

function finishTimer() {
  stopInterval();
  timerRemainingMs = 0;
  startPauseButton.textContent = "開始";
  setStatus("完了", "done");
  renderTimer();
  playDoneSound();
}

function tickTimer() {
  timerRemainingMs = Math.max(0, timerEndsAt - Date.now());
  renderTimer();

  if (timerRemainingMs <= 0) {
    finishTimer();
  }
}

function tickStopwatch() {
  renderStopwatch();
}

function startTimer() {
  if (timerRemainingMs <= 0) {
    timerRemainingMs = timerTotalMs;
  }

  timerEndsAt = Date.now() + timerRemainingMs;
  intervalId = setInterval(tickTimer, 100);
  startPauseButton.textContent = "一時停止";
  setStatus("実行中", "running");
  tickTimer();
}

function pauseTimer() {
  timerRemainingMs = Math.max(0, timerEndsAt - Date.now());
  stopInterval();
  startPauseButton.textContent = "再開";
  setStatus("一時停止");
  renderTimer();
}

function startStopwatch() {
  stopwatchStartedAt = Date.now();
  intervalId = setInterval(tickStopwatch, 30);
  startPauseButton.textContent = "一時停止";
  setStatus("計測中", "running");
  tickStopwatch();
}

function pauseStopwatch() {
  stopwatchElapsedMs += Date.now() - stopwatchStartedAt;
  stopInterval();
  startPauseButton.textContent = "再開";
  setStatus("一時停止");
  renderStopwatch();
}

function setTimerDuration(ms) {
  const nextMs = Math.max(1000, ms);
  stopInterval();
  timerTotalMs = nextMs;
  timerRemainingMs = nextMs;
  startPauseButton.textContent = "開始";
  setStatus("待機中");
  renderTimer();
}

function syncInputs(ms) {
  const totalSeconds = Math.round(ms / 1000);
  minutesInput.value = Math.floor(totalSeconds / 60);
  secondsInput.value = totalSeconds % 60;
}

function resetTimer() {
  stopInterval();
  timerRemainingMs = timerTotalMs;
  startPauseButton.textContent = "開始";
  setStatus("待機中");
  renderTimer();
}

function resetStopwatch() {
  stopInterval();
  stopwatchElapsedMs = 0;
  stopwatchStartedAt = 0;
  lapCount = 0;
  lapList.innerHTML = "";
  startPauseButton.textContent = "開始";
  setStatus("待機中");
  renderStopwatch();
}

function addLap() {
  const elapsed = isRunning()
    ? stopwatchElapsedMs + Date.now() - stopwatchStartedAt
    : stopwatchElapsedMs;

  if (elapsed <= 0) return;

  lapCount += 1;
  const item = document.createElement("li");
  const label = document.createElement("span");
  const value = document.createElement("span");

  label.textContent = `Lap ${lapCount}`;
  value.textContent = formatStopwatch(elapsed);
  item.append(label, value);
  lapList.prepend(item);
}

function switchMode(nextMode) {
  if (mode === nextMode) return;

  stopInterval();
  mode = nextMode;
  document.body.dataset.mode = mode;

  modeTabs.forEach((tab) => {
    const selected = tab.dataset.mode === mode;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });

  const stopwatchMode = mode === "stopwatch";
  appTitle.textContent = stopwatchMode ? "ストップウォッチ" : "タイマー";
  timerSettings.hidden = stopwatchMode;
  lapButton.hidden = !stopwatchMode;
  controlRow.classList.toggle("with-lap", stopwatchMode);
  startPauseButton.textContent = "開始";
  setStatus("待機中");

  if (stopwatchMode) {
    renderStopwatch();
  } else {
    renderTimer();
  }
}

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    presetButtons.forEach((preset) => preset.classList.remove("active"));
    button.classList.add("active");

    const minutes = Number(button.dataset.minutes);
    const ms = minutes * 60 * 1000;
    syncInputs(ms);
    setTimerDuration(ms);
  });
});

customTimeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  presetButtons.forEach((preset) => preset.classList.remove("active"));

  const minutes = Number(minutesInput.value) || 0;
  const seconds = Number(secondsInput.value) || 0;
  const normalizedSeconds = Math.min(59, Math.max(0, seconds));

  secondsInput.value = normalizedSeconds;
  setTimerDuration((minutes * 60 + normalizedSeconds) * 1000);
});

modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchMode(tab.dataset.mode));
});

startPauseButton.addEventListener("click", () => {
  if (mode === "timer") {
    isRunning() ? pauseTimer() : startTimer();
    return;
  }

  isRunning() ? pauseStopwatch() : startStopwatch();
});

lapButton.addEventListener("click", addLap);

resetButton.addEventListener("click", () => {
  if (mode === "timer") {
    resetTimer();
  } else {
    resetStopwatch();
  }
});

renderTimer();
