const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

io.on('connection', (socket) => {
  console.log('🟢 Novo usuário conectado:', socket.id);

  socket.on('mensagem', (msg) => {
    console.log('💬 Mensagem recebida:', msg);
    io.emit('mensagem', msg); // envia pra todos
  });

  socket.on('disconnect', () => {
    console.log('🔴 Usuário desconectado:', socket.id);
  });
});

app.get('/', (req, res) => {
  res.send('Servidor de chat em tempo real ativo!');
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
