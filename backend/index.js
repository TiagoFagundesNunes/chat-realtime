require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pool = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Rota simples para checagem
app.get('/', (req, res) => {
  res.send('Servidor de chat em tempo real ativo!');
});

// Middleware de autenticação
io.use(async (socket, next) => {
  const { usuario_id } = socket.handshake.auth;

  if (!usuario_id) {
    return next(new Error('Usuário não autenticado (ID ausente)'));
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE id = $1',
      [usuario_id]
    );

    if (rows.length === 0) {
      return next(new Error('Usuário não encontrado'));
    }

    socket.usuario = rows[0];
    next();
  } catch (err) {
    console.error('Erro na autenticação do socket:', err);
    return next(new Error('Erro interno de autenticação'));
  }
});

io.on('connection', (socket) => {
  console.log('🟢 Novo usuário autenticado:', socket.usuario.nome);

  // Broadcast legado (opcional)
  socket.on('mensagem', (msg) => {
    io.emit('mensagem', msg);
  });

  // Entrar em uma conversa
  socket.on('joinRoom', async ({ conversa_id }) => {
    const usuario_id = socket.usuario.id;
    try {
      socket.join(conversa_id);
      console.log(`👤 Usuário ${usuario_id} entrou na conversa ${conversa_id}`);

      await pool.query(
        `INSERT INTO chat_participantes (conversa_id, usuario_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [conversa_id, usuario_id]
      );

      const { rows } = await pool.query(
        `SELECT * 
           FROM chat_mensagens 
          WHERE conversa_id = $1 
       ORDER BY criado_em ASC`,
        [conversa_id]
      );
      socket.emit('chatHistory', rows);
    } catch (err) {
      console.error('Erro no joinRoom:', err);
      socket.emit('error', 'Não foi possível entrar na conversa');
    }
  });

  // Enviar mensagem
  socket.on('sendMessage', async ({ conversa_id, conteudo, tipo = 'texto' }) => {
    const usuario_id = socket.usuario.id;
    try {
      const { rows } = await pool.query(
        `INSERT INTO chat_mensagens 
           (conversa_id, usuario_id, conteudo, tipo) 
         VALUES ($1, $2, $3, $4) 
       RETURNING *`,
        [conversa_id, usuario_id, conteudo, tipo]
      );

      io.to(conversa_id).emit('newMessage', rows[0]);
    } catch (err) {
      console.error('Erro no sendMessage:', err);
      socket.emit('error', 'Não foi possível enviar a mensagem');
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 Desconectado:', socket.usuario.nome);
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
