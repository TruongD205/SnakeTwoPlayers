// CONTROLLER (server): nhận sự kiện socket, điều khiển model, gửi trạng thái cho client.
const { RoomManager } = require('../models/Room');

const TICK_MS = 150;
const COUNTDOWN_S = 3;
const ROUND_END_PAUSE_MS = 1200;
const ACCESSORIES = ['none', 'bow', 'hat', 'crown', 'glasses', 'tophat'];

class GameController {
  constructor(io) {
    this.io = io;
    this.rooms = new RoomManager();
  }

  register(socket) {
    socket.on('create-room', (skin) => this.createRoom(socket, skin));
    socket.on('solo-room', (skin) => this.soloRoom(socket, skin));
    socket.on('join-room', (data) => this.joinRoom(socket, data));
    socket.on('leave-room', () => this.leave(socket));
    socket.on('dir', (dir) => this.setDir(socket, dir));
    socket.on('rematch', () => this.rematch(socket));
    socket.on('disconnect', () => this.leave(socket));
  }

  createRoom(socket, skin) {
    this.leave(socket);
    const room = this.rooms.create();
    const idx = this._enter(socket, room);
    this._applySkin(room, idx, skin);
    socket.emit('room-joined', { code: room.code, you: idx });
  }

  // Chơi thử 1 mình: phòng riêng chỉ có 1 rắn, không cần đối thủ, bắt đầu ngay.
  soloRoom(socket, skin) {
    this.leave(socket);
    const room = this.rooms.create();
    room.solo = true;
    const idx = this._enter(socket, room);
    this._applySkin(room, idx, skin);
    socket.emit('room-joined', { code: room.code, you: idx });
    room.newGame();
    this.startCountdown(room);
  }

  joinRoom(socket, data) {
    const room = this.rooms.get(data && data.code);
    if (!room) return socket.emit('error-msg', 'Không tìm thấy phòng');
    if (room.isFull()) return socket.emit('error-msg', 'Phòng đã đầy');
    this.leave(socket);
    const idx = this._enter(socket, room);
    this._applySkin(room, idx, data.skin);
    // Trùng màu với người trong phòng -> tự đổi sang màu khác
    if (room.skins[1].color === room.skins[0].color) {
      room.skins[1].color = (room.skins[0].color + 1) % 6;
    }
    socket.emit('room-joined', { code: room.code, you: idx });
    // Đủ 2 người, trang phục đã chọn từ trước -> đếm ngược và chơi luôn
    room.newGame();
    this.startCountdown(room);
  }

  _enter(socket, room) {
    socket.join(room.code);
    socket.data.roomCode = room.code;
    return room.addPlayer(socket.id);
  }

  // Kiểm tra và lưu màu/phụ kiện người chơi đã chọn ở trang chủ.
  _applySkin(room, idx, skin) {
    const colorOk = skin && Number.isInteger(skin.color) && skin.color >= 0 && skin.color < 6;
    const accOk = skin && ACCESSORIES.includes(skin.acc);
    if (colorOk && accOk) room.skins[idx] = { color: skin.color, acc: skin.acc };
  }

  _emitState(room) {
    this.io.to(room.code).emit('state', {
      status: room.status,
      game: room.game.toState(),
      skins: room.skins,
    });
  }

  // Đếm ngược 3-2-1 rồi chạy game (dùng cho lúc bắt đầu và sau mỗi lần mất mạng).
  startCountdown(room) {
    clearInterval(room.timer);
    room.status = 'countdown';
    room.rematchVotes.clear();
    this._emitState(room);
    let n = COUNTDOWN_S;
    this.io.to(room.code).emit('countdown', n);
    room.timer = setInterval(() => {
      n--;
      if (n > 0) return this.io.to(room.code).emit('countdown', n);
      clearInterval(room.timer);
      this.startPlaying(room);
    }, 1000);
  }

  startPlaying(room) {
    room.status = 'playing';
    room.timer = setInterval(() => {
      room.game.tick();
      if (room.game.over) {
        clearInterval(room.timer);
        room.status = 'ended';
      } else if (room.game.roundEnded) {
        clearInterval(room.timer);
        room.status = 'roundend';
        this._emitState(room);
        room.timer = setTimeout(() => {
          if (!this.rooms.get(room.code)) return;
          room.game.respawn();
          this.startCountdown(room);
        }, ROUND_END_PAUSE_MS);
        return;
      }
      this._emitState(room);
    }, TICK_MS);
  }

  setDir(socket, dir) {
    const room = this.rooms.get(socket.data.roomCode);
    if (!room || room.status !== 'playing') return;
    room.game.setDirection(room.indexOf(socket.id), dir);
  }

  // Chơi lại cần CẢ HAI đồng ý.
  rematch(socket) {
    const room = this.rooms.get(socket.data.roomCode);
    if (!room || room.status !== 'ended' || !room.isFull()) return;
    room.rematchVotes.add(room.indexOf(socket.id));
    this.io.to(room.code).emit('rematch-status', [...room.rematchVotes]);
    if (room.rematchVotes.size === 2) {
      room.newGame();
      this.startCountdown(room);
    }
  }

  leave(socket) {
    const code = socket.data.roomCode;
    const room = this.rooms.get(code);
    if (!room) return;
    socket.leave(code);
    socket.data.roomCode = null;
    clearInterval(room.timer);
    clearTimeout(room.timer);
    this.io.to(code).emit('opponent-left');
    this.rooms.remove(code);
    this.io.in(code).socketsLeave(code);
  }
}

module.exports = GameController;
