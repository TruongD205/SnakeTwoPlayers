// CONTROLLER (client): nhận input + sự kiện mạng -> cập nhật model -> gọi view vẽ lại.
const socket = io();
const $ = (id) => document.getElementById(id);

// ---------- Sự kiện từ server ----------
socket.on('room-joined', ({ code, you }) => {
  model.roomCode = code;
  model.you = you;
  model.status = 'waiting'; // người thứ 2 vào sẽ nhận 'countdown' ngay sau đó
  view.showMenuError('');
  view.render(model);
});

socket.on('countdown', (n) => {
  model.status = 'countdown';
  model.countdown = n;
  view.render(model);
});

socket.on('state', ({ status, game, skins }) => {
  model.status = status;
  model.game = game;
  model.skins = skins;
  if (status !== 'countdown') model.countdown = null;
  if (status !== 'ended') model.rematchVotes = [];
  view.render(model);
});

socket.on('rematch-status', (votes) => {
  model.rematchVotes = votes;
  view.render(model);
});

socket.on('opponent-left', () => {
  if (model.status === 'customize' || model.status === 'menu') return;
  model.status = 'left';
  view.render(model);
});

socket.on('error-msg', (msg) => view.showMenuError(msg));

// ---------- Input ----------
function goHome() {
  socket.emit('leave-room');
  model.reset();
  view.render(model);
}

function chooseSkin(patch) {
  model.mySkin = { ...model.mySkin, ...patch };
  view.render(model);
}
view.buildChoices(
  (color) => chooseSkin({ color }),
  (acc) => chooseSkin({ acc })
);

$('btn-continue').onclick = () => {
  model.status = 'menu';
  view.render(model);
};
$('btn-change-skin').onclick = () => {
  model.status = 'customize';
  view.showMenuError('');
  view.render(model);
};
$('btn-create').onclick = () => socket.emit('create-room', model.mySkin);
$('btn-join').onclick = () => socket.emit('join-room', { code: $('input-code').value, skin: model.mySkin });
$('btn-cancel').onclick = goHome;
$('btn-rematch').onclick = () => socket.emit('rematch');
$('btn-home').onclick = goHome;

const sendDir = (d) => socket.emit('dir', d);
document.querySelectorAll('#pad button').forEach((b) => {
  const fire = (e) => {
    e.preventDefault();
    sendDir(b.dataset.dir);
  };
  b.addEventListener('touchstart', fire, { passive: false });
  b.addEventListener('mousedown', fire);
});

const KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
};
document.addEventListener('keydown', (e) => {
  const d = KEYS[e.key];
  const inGame = ['countdown', 'playing', 'roundend'].includes(model.status);
  if (d && inGame) {
    e.preventDefault();
    sendDir(d);
  }
});

view.render(model);
