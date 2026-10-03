// MODEL (client): chỉ lưu dữ liệu, không đụng DOM hay socket.
const model = {
  roomCode: null,
  you: null, // 0 | 1
  // customize (trang chủ chọn trang phục) | menu (tạo/vào phòng) | waiting | countdown | playing | roundend | ended | left
  status: "customize",
  countdown: null,
  game: null,
  prevGame: null, // trạng thái tick trước, dùng để vẽ mượt giữa 2 tick
  stateAt: 0, // thời điểm nhận trạng thái mới nhất (ms)
  rematchVotes: [], // index người đã đồng ý chơi lại
  mySkin: { color: 0, acc: "none" }, // trang phục mình chọn (giữ lại giữa các ván)
  skins: [
    { color: 0, acc: "none" },
    { color: 1, acc: "none" },
  ], // trang phục cả 2 người trong ván

  // Về trang chủ: bỏ phòng, giữ trang phục đã chọn để đổi tiếp.
  reset() {
    this.rematchVotes = [];
    this.roomCode = null;
    this.you = null;
    this.status = "customize";
    this.countdown = null;
    this.game = null;
    this.prevGame = null;
  },
};
