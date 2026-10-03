// MODEL (client): chỉ lưu dữ liệu, không đụng DOM hay socket.
const model = {
  roomCode: null,
  you: null, // 0 | 1
  status: "menu", // menu | waiting | countdown | playing | ended | left
  countdown: null,
  game: null,

  reset() {
    this.roomCode = null;
    this.you = null;
    this.status = "menu";
    this.countdown = null;
    this.game = null;
  },
};
