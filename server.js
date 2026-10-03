// Điểm khởi động server: chỉ ráp Express + Socket.IO + Controller.
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const GameController = require('./controllers/GameController');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const controller = new GameController(io);

app.use(express.static('public')); // VIEW (client) nằm trong /public
io.on('connection', (socket) => controller.register(socket));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server chạy tại http://localhost:' + PORT));
