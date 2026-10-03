// MODEL: luật game rắn 2 người (5 mạng). Không biết gì về mạng hay giao diện.
const W = 20;
const H = 20;
const LIVES = 5;
const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const START = [
  { x: 4, dir: 'right' },
  { x: 15, dir: 'left' },
];

class SnakeGame {
  // solo = chế độ chơi thử 1 mình: chỉ có rắn số 0, không mất mạng, không kết thúc.
  constructor(solo = false) {
    this.solo = solo;
    this.width = W;
    this.height = H;
    this.lives = [LIVES, LIVES];
    this.snakes = [this._makeSnake(0, 10), this._makeSnake(1, 10)];
    if (solo) this.snakes[1].body = [];
    this.food = null;
    this.roundEnded = false; // có người vừa mất mạng, chờ hồi sinh
    this.over = false; // hết mạng
    this.winner = null; // 0 | 1 | null
    this._spawnFood();
  }

  _makeSnake(i, y) {
    const { x, dir } = START[i];
    const d = DIRS[dir];
    return {
      body: [
        { x, y },
        { x: x - d.x, y: y - d.y },
        { x: x - 2 * d.x, y: y - 2 * d.y },
      ],
      dir,
      queue: [],
      alive: true,
      pendingGrowth: 0,
    };
  }

  // Hàng đợi hướng đi: bấm nhanh "trái rồi xuống" thì cả 2 lệnh đều được giữ,
  // tick này rẽ trái, tick sau rẽ xuống (trước đây lệnh sau đè mất lệnh trước).
  setDirection(playerIndex, dir) {
    const s = this.snakes[playerIndex];
    if (!s || !DIRS[dir]) return;
    const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
    if (dir === last || OPPOSITE[dir] === last) return; // bỏ lệnh trùng và không quay đầu 180 độ
    if (s.queue.length < 3) s.queue.push(dir);
  }

  _occupied() {
    const taken = new Set();
    this.snakes.forEach((s) => {
      if (s.alive) s.body.forEach((c) => taken.add(c.x + ',' + c.y));
    });
    return taken;
  }

  _spawnFood() {
    const taken = new Set();
    this.snakes.forEach((s) => {
      if (s.alive) s.body.forEach((c) => taken.add(c.x + ',' + c.y));
    });
    const free = [];
    for (let x = 0; x < W; x++)
      for (let y = 0; y < H; y++) if (!taken.has(x + ',' + y)) free.push({ x, y });
    if (!free.length) {
      this.food = null;
      return;
    }
    const cell = free[Math.floor(Math.random() * free.length)];

    // Xác suất:
    // Táo: 50% (+1)
    // Dứa: 30% (+2)
    // Quả dưa hấu: 20% (+3)
    const roll = Math.random();
    let type = 'apple';
    let growth = 1;
    if (roll < 0.50) {
      type = 'apple';
      growth = 1;
    } else if (roll < 0.80) {
      type = 'pineapple';
      growth = 2;
    } else {
      type = 'watermelon';
      growth = 3;
    }

    this.food = { x: cell.x, y: cell.y, type, growth };
  }

  tick() {
    if (this.over || this.roundEnded) return;
    let ate = false;
    this.snakes.forEach((s, i) => {
      if (this.solo && i === 1) return;
      if (s.queue.length) s.dir = s.queue.shift(); // mỗi tick lấy 1 lệnh rẽ trong hàng đợi
      const d = DIRS[s.dir];
      const head = { x: s.body[0].x + d.x, y: s.body[0].y + d.y };
      s.body.unshift(head);

      if (this.food && head.x === this.food.x && head.y === this.food.y) {
        ate = true;
        s.pendingGrowth += (this.food.growth - 1);
      } else {
        if (s.pendingGrowth > 0) {
          s.pendingGrowth--;
        } else {
          s.body.pop();
        }
      }
    });

    this.snakes.forEach((s, i) => {
      if (this.solo && i === 1) return;
      const h = s.body[0];
      const other = this.snakes[1 - i];
      const hitWall = h.x < 0 || h.y < 0 || h.x >= W || h.y >= H;
      const hitSelf = s.body.slice(1).some((c) => c.x === h.x && c.y === h.y);
      const hitOther = other.body.some((c) => c.x === h.x && c.y === h.y);
      if (hitWall || hitSelf || hitOther) s.alive = false;
    });

    if (ate) this._spawnFood();

    const dead = this.snakes.map((s, i) => (s.alive ? -1 : i)).filter((i) => i >= 0);
    if (dead.length === 0) return;
    if (!this.solo) dead.forEach((i) => this.lives[i]--); // chơi thử: không mất mạng
    this.roundEnded = true;
    if (this.solo) return;
    const out = this.lives.map((l, i) => (l <= 0 ? i : -1)).filter((i) => i >= 0);
    if (out.length) {
      this.over = true;
      this.winner = out.length === 2 ? 'draw' : 1 - out[0];
    }
  }

  // Hồi sinh rắn vừa chết (nhỏ lại), rắn còn sống giữ nguyên độ dài.
  respawn() {
    const taken = this._occupied();
    this.snakes.forEach((s, i) => {
      if (s.alive) return;
      let best = null;
      for (let off = 0; off < H && !best; off++) {
        for (const y of [10 + off, 10 - off]) {
          const fresh = this._makeSnake(i, y);
          const d = DIRS[fresh.dir];
          const ahead = { x: fresh.body[0].x + d.x * 2, y: fresh.body[0].y };
          const cells = [...fresh.body, ahead, { x: ahead.x + d.x, y: ahead.y }];
          if (y >= 1 && y < H - 1 && cells.every((c) => !taken.has(c.x + ',' + c.y))) {
            best = fresh;
            break;
          }
        }
      }
      this.snakes[i] = best || this._makeSnake(i, 10);
      this.snakes[i].body.forEach((c) => taken.add(c.x + ',' + c.y));
    });
    this.snakes.forEach((s) => (s.queue = []));
    this.roundEnded = false;
    if (!this.food) this._spawnFood();
  }

  toState() {
    return {
      width: this.width,
      height: this.height,
      food: this.food,
      lives: this.lives,
      snakes: this.snakes.map((s) => ({ body: s.body, alive: s.alive })),
      roundEnded: this.roundEnded,
      over: this.over,
      winner: this.winner,
      solo: this.solo,
    };
  }
}

module.exports = SnakeGame;
