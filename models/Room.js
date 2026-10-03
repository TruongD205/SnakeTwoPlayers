// MODEL: phòng chơi và bộ quản lý phòng (lưu trong bộ nhớ).
const SnakeGame = require('./SnakeGame');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ ký tự dễ nhầm (O,0,I,1)

class Room {
  constructor(code) {
    this.code = code;
    this.players = []; // socket id, index = số thứ tự người chơi (0 | 1)
    this.status = 'waiting'; // waiting | countdown | playing | ended
    this.game = null;
    this.timer = null;
    this.rematchVotes = new Set(); // index người chơi đã đồng ý chơi lại
    this.skins = [
      { color: 0, acc: 'none' },
      { color: 1, acc: 'none' },
    ]; // màu + phụ kiện của từng người
    this.ready = new Set(); // index người đã chọn xong ở phòng chờ
    this.solo = false; // true = phòng chơi thử 1 mình
  }

  isFull() {
    return this.solo || this.players.length >= 2; // phòng chơi thử coi như đã đầy
  }

  addPlayer(id) {
    this.players.push(id);
    return this.players.length - 1;
  }

  indexOf(id) {
    return this.players.indexOf(id);
  }

  newGame() {
    this.game = new SnakeGame(this.solo);
  }
}

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  create() {
    let code;
    do {
      code = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
    } while (this.rooms.has(code));
    const room = new Room(code);
    this.rooms.set(code, room);
    return room;
  }

  get(code) {
    return this.rooms.get(String(code || '').trim().toUpperCase());
  }

  remove(code) {
    this.rooms.delete(code);
  }
}

module.exports = { Room, RoomManager };
