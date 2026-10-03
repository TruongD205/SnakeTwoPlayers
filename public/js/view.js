// VIEW (client): vẽ giao diện từ model. Không chứa logic mạng.
const view = {
  $: (id) => document.getElementById(id),
  PALETTE: ['#4ade80', '#f472b6', '#60a5fa', '#fb923c', '#a78bfa', '#facc15'],
  ACCS: [
    { id: 'none', icon: '🚫' },
    { id: 'bow', icon: '🎀' },
    { id: 'hat', icon: '🥳' },
    { id: 'crown', icon: '👑' },
    { id: 'glasses', icon: '🕶️' },
    { id: 'tophat', icon: '🎩' },
  ],

  SCREENS: { customize: 'customize', menu: 'menu', waiting: 'wait' },

  render(m) {
    const screen = this.SCREENS[m.status] || 'game';
    ['customize', 'menu', 'wait', 'game'].forEach((s) =>
      this.$('screen-' + s).classList.toggle('hidden', s !== screen)
    );
    if (screen === 'customize') return this.renderCustomize(m);
    if (screen === 'menu') return this.renderMenu(m);
    if (screen === 'wait') return (this.$('wait-code').textContent = m.roomCode || '----');

    this.$('room-code').textContent = m.roomCode || '----';
    this.drawBoard(m);
    this.drawScores(m);
    this.drawOverlay(m);
    this.drawRematch(m);
    this.$('btn-home').classList.toggle('hidden', m.status !== 'ended' && m.status !== 'left');
  },

  // ---------- Trang chủ: chọn màu + phụ kiện ----------
  buildChoices(onColor, onAcc) {
    const colors = this.$('colors');
    const accs = this.$('accs');
    colors.innerHTML = '';
    accs.innerHTML = '';
    this.PALETTE.forEach((c, i) => {
      const b = document.createElement('button');
      b.style.background = c;
      b.dataset.i = i;
      b.onclick = () => onColor(i);
      colors.appendChild(b);
    });
    this.ACCS.forEach((a) => {
      const b = document.createElement('button');
      b.textContent = a.icon;
      b.dataset.id = a.id;
      b.onclick = () => onAcc(a.id);
      accs.appendChild(b);
    });
  },

  renderCustomize(m) {
    const mine = m.mySkin;
    [...this.$('colors').children].forEach((b) =>
      b.classList.toggle('selected', Number(b.dataset.i) === mine.color)
    );
    [...this.$('accs').children].forEach((b) =>
      b.classList.toggle('selected', b.dataset.id === mine.acc)
    );
    this.drawPreview('preview', mine);
  },

  renderMenu(m) {
    this.drawPreview('preview-mini', m.mySkin);
  },

  drawPreview(id, skin) {
    const pv = this.$(id);
    const ctx = pv.getContext('2d');
    ctx.clearRect(0, 0, pv.width, pv.height);
    const s = pv.width / 2;
    this.drawHead(ctx, s / 2, s / 2 + s * 0.1, s, 1, 0, this.PALETTE[skin.color], skin.acc);
  },

  // ---------- Vẽ rắn dễ thương ----------
  // (x,y) góc trên trái, s = kích thước ô, (dx,dy) = hướng nhìn
  drawHead(ctx, x, y, s, dx, dy, color, acc, dead) {
    const cx = x + s / 2;
    const cy = y + s / 2;
    ctx.fillStyle = dead ? '#777' : color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.58, 0, Math.PI * 2); // đầu tròn to hơn thân
    ctx.fill();
    ctx.stroke();

    // mắt (nhìn theo hướng đi)
    const ex = cx + dx * s * 0.15;
    const ey = cy + dy * s * 0.15;
    const px = -dy * s * 0.22;
    const py = dx * s * 0.22;
    [1, -1].forEach((sg) => {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ex + px * sg, ey + py * sg, s * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      if (dead) {
        ctx.fillRect(ex + px * sg - s * 0.08, ey + py * sg - s * 0.02, s * 0.16, s * 0.04);
      } else {
        ctx.arc(ex + px * sg + dx * s * 0.06, ey + py * sg + dy * s * 0.06, s * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // má hồng
    ctx.fillStyle = 'rgba(255,120,150,.55)';
    [1, -1].forEach((sg) => {
      ctx.beginPath();
      ctx.arc(cx + dx * s * 0.28 + px * 1.5 * sg, cy + dy * s * 0.28 + py * 1.5 * sg, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
    });
    // miệng cười
    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    ctx.beginPath();
    ctx.arc(cx + dx * s * 0.3, cy + dy * s * 0.3, s * 0.07, 0, Math.PI);
    if (dx !== 0 || dy !== 1) ctx.stroke();

    this.drawAccessory(ctx, cx, cy, s, acc, dx, dy);
  },

  drawAccessory(ctx, cx, cy, s, acc) {
    const top = cy - s * 0.5;
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    ctx.strokeStyle = '#222';
    if (acc === 'bow') {
      ctx.fillStyle = '#ef4444';
      const bx = cx + s * 0.32;
      const by = top + s * 0.1;
      [-1, 1].forEach((sg) => {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + sg * s * 0.3, by - s * 0.18);
        ctx.lineTo(bx + sg * s * 0.3, by + s * 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.arc(bx, by, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else if (acc === 'hat') {
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.3, top + s * 0.1);
      ctx.lineTo(cx, top - s * 0.55);
      ctx.lineTo(cx + s * 0.3, top + s * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(cx, top - s * 0.55, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else if (acc === 'crown') {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.32, top + s * 0.12);
      ctx.lineTo(cx - s * 0.32, top - s * 0.3);
      ctx.lineTo(cx - s * 0.12, top - s * 0.1);
      ctx.lineTo(cx, top - s * 0.38);
      ctx.lineTo(cx + s * 0.12, top - s * 0.1);
      ctx.lineTo(cx + s * 0.32, top - s * 0.3);
      ctx.lineTo(cx + s * 0.32, top + s * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (acc === 'tophat') {
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(cx - s * 0.5, top + s * 0.02, s, s * 0.12);
      ctx.fillRect(cx - s * 0.28, top - s * 0.5, s * 0.56, s * 0.54);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - s * 0.28, top - s * 0.1, s * 0.56, s * 0.1);
    } else if (acc === 'glasses') {
      ctx.fillStyle = 'rgba(20,20,20,.85)';
      [-1, 1].forEach((sg) => {
        ctx.beginPath();
        ctx.arc(cx + sg * s * 0.22, cy - s * 0.03, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.05, cy - s * 0.03);
      ctx.lineTo(cx + s * 0.05, cy - s * 0.03);
      ctx.stroke();
    }
  },

  drawBoard(m) {
    const game = m.game;
    const canvas = this.$('board');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!game) return;
    const cs = canvas.width / game.width;
    if (game.food) {
      const fx = (game.food.x + 0.5) * cs;
      const fy = (game.food.y + 0.5) * cs;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(fx, fy, cs * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(fx - 1, fy - cs * 0.5, 3, cs * 0.18);
    }
    game.snakes.forEach((s, i) => {
      const skin = m.skins[i];
      const base = s.alive ? this.PALETTE[skin.color] : '#777';
      const n = s.body.length;
      // thân tròn, nhỏ dần về đuôi
      for (let k = n - 1; k >= 1; k--) {
        const c = s.body[k];
        const t = k / n;
        const r = cs * (0.46 - 0.16 * t);
        ctx.globalAlpha = 1 - 0.3 * t;
        ctx.fillStyle = base;
        ctx.beginPath();
        ctx.arc((c.x + 0.5) * cs, (c.y + 0.5) * cs, r, 0, Math.PI * 2);
        ctx.fill();
        if (k % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,.25)';
          ctx.beginPath();
          ctx.arc((c.x + 0.5) * cs, (c.y + 0.5) * cs, r * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      const h = s.body[0];
      const nx = s.body[1] || h;
      const dx = Math.sign(h.x - nx.x) || 1;
      const dy = Math.sign(h.y - nx.y);
      this.drawHead(ctx, h.x * cs, h.y * cs, cs, dx * (dy ? 0 : 1), dy, base, skin.acc, !s.alive);
    });
  },

  // Mạng chia đều 2 bên; độ dài chỉ hiện ở bên mình.
  drawScores(m) {
    const g = m.game;
    const hearts = (i) => {
      const l = g ? Math.max(g.lives[i], 0) : 5;
      return '❤️'.repeat(l) + '🖤'.repeat(5 - l);
    };
    const me = m.you;
    this.$('score-me').innerHTML = '<span class="me">Bạn</span><br>' + hearts(me) + '<br>Dài: ' + (g ? g.snakes[me].body.length : 3);
    this.$('score-opp').innerHTML = 'Đối thủ<br>' + hearts(1 - me);
  },

  drawOverlay(m) {
    const el = this.$('overlay');
    let text = '';
    if (m.status === 'countdown') text = m.countdown || 'Sẵn sàng';
    else if (m.status === 'roundend') {
      const dead = m.game.snakes.map((s, i) => (s.alive ? -1 : i)).filter((i) => i >= 0);
      text = dead.length === 2 ? '💥 Cả hai mất 1 mạng!' : dead[0] === m.you ? '💥 Bạn mất 1 mạng!' : '💥 Đối thủ mất 1 mạng!';
    } else if (m.status === 'ended') {
      const w = m.game.winner;
      text = w === 'draw' ? 'Hòa!' : w === m.you ? 'Bạn thắng! 🎉' : 'Bạn thua 😢';
    } else if (m.status === 'left') text = 'Đối thủ đã thoát';
    el.textContent = text;
    el.style.whiteSpace = 'pre-line';
    el.classList.toggle('hidden', !text);
  },

  drawRematch(m) {
    const btn = this.$('btn-rematch');
    btn.classList.toggle('hidden', m.status !== 'ended');
    const mine = m.rematchVotes.includes(m.you);
    const theirs = m.rematchVotes.includes(1 - m.you);
    btn.disabled = mine;
    btn.textContent = mine ? 'Đã đồng ý, chờ đối thủ...' : theirs ? 'Đối thủ muốn chơi lại - Đồng ý' : 'Chơi lại';
  },

  showMenuError(msg) {
    this.$('menu-error').textContent = msg || '';
  },
};
