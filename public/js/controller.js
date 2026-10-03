// CONTROLLER (client): nhận input + sự kiện mạng -> cập nhật model -> gọi view vẽ lại.
const socket = io({ transports: ["websocket"] }); // kết nối WebSocket thẳng, bỏ qua long-polling để giảm trễ
const $ = (id) => document.getElementById(id);

// ---------- Sự kiện từ server ----------
socket.on("room-joined", ({ code, you }) => {
  model.roomCode = code;
  model.you = you;
  model.status = "waiting"; // người thứ 2 vào sẽ nhận 'countdown' ngay sau đó
  view.showMenuError("");
  view.render(model);
});

socket.on("countdown", (n) => {
  model.status = "countdown";
  model.countdown = n;
  view.render(model);
});

socket.on("state", ({ status, game, skins }) => {
  model.prevGame = model.status === "playing" && status === "playing" ? model.game : null;
  model.stateAt = performance.now();
  model.status = status;
  model.game = game;
  model.skins = skins;
  if (status !== "countdown") model.countdown = null;
  if (status !== "ended") model.rematchVotes = [];
  view.render(model);
});

socket.on("rematch-status", (votes) => {
  model.rematchVotes = votes;
  view.render(model);
});

socket.on("opponent-left", () => {
  if (model.status === "customize" || model.status === "menu") return;
  model.status = "left";
  view.render(model);
});

socket.on("error-msg", (msg) => view.showMenuError(msg));

// ---------- Input ----------
function goHome() {
  socket.emit("leave-room");
  model.reset();
  view.render(model);
}

function chooseSkin(patch) {
  model.mySkin = { ...model.mySkin, ...patch };
  view.render(model);
}
view.buildChoices(
  (color) => chooseSkin({ color }),
  (acc) => chooseSkin({ acc }),
);

$("btn-continue").onclick = () => {
  model.status = "menu";
  view.render(model);
};
$("btn-change-skin").onclick = () => {
  model.status = "customize";
  view.showMenuError("");
  view.render(model);
};
$("btn-create").onclick = () => socket.emit("create-room", model.mySkin);
$("btn-solo").onclick = () => socket.emit("solo-room", model.mySkin);
$("btn-join").onclick = () => socket.emit("join-room", { code: $("input-code").value, skin: model.mySkin });
$("btn-cancel").onclick = goHome;
$("btn-rematch").onclick = () => socket.emit("rematch");
$("btn-home").onclick = goHome;

const sendDir = (d) => socket.emit("dir", d);
document.querySelectorAll("#pad button").forEach((b) => {
  const fire = (e) => {
    e.preventDefault();
    sendDir(b.dataset.dir);
  };
  b.addEventListener("touchstart", fire, { passive: false });
  b.addEventListener("mousedown", fire);
});

// Vuốt trên bàn chơi để đổi hướng (tiện cho điện thoại, ngoài 4 nút)
let swipeStart = null;
const boardEl = $("canvas-wrap");
boardEl.addEventListener("touchstart", (e) => {
  const t = e.changedTouches[0];
  swipeStart = { x: t.clientX, y: t.clientY };
}, { passive: true });
boardEl.addEventListener("touchend", (e) => {
  if (!swipeStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - swipeStart.x;
  const dy = t.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; // chạm nhẹ, không phải vuốt
  sendDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
}, { passive: true });

// Xoay màn hình / đổi kích thước cửa sổ -> vẽ lại cho vừa
window.addEventListener("resize", () => view.render(model));
window.addEventListener("orientationchange", () => setTimeout(() => view.render(model), 200));

const KEYS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};
document.addEventListener("keydown", (e) => {
  const d = KEYS[e.key];
  const inGame = ["countdown", "playing", "roundend"].includes(model.status);
  if (d && inGame) {
    e.preventDefault();
    sendDir(d);
  }
});

// Vòng lặp vẽ ~60fps: server gửi mỗi 150ms nên ta nội suy vị trí rắn giữa 2 lần cập nhật cho mượt.
const TICK_MS = 150;
function animate() {
  if (model.status === "playing" && model.game) {
    view.drawBoard(model, Math.min((performance.now() - model.stateAt) / TICK_MS, 1));
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

view.render(model);
