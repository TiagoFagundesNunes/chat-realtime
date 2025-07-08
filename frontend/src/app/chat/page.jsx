'use client';

import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socketRef = useRef(null);

  const CONVERSA_ID = 1;         // ID fixo da conversa (você pode mudar)
  const USUARIO_ID = 1;          // ID do usuário logado (teste)

  useEffect(() => {
    // Conectar ao Socket.IO com autenticação
    socketRef.current = io('http://localhost:3001', {
      auth: {
        usuario_id: USUARIO_ID
      }
    });

    socketRef.current.on('connect', () => {
      console.log('🟢 Conectado com ID:', socketRef.current.id);
      // Entrar na conversa
      socketRef.current.emit('joinRoom', { conversa_id: CONVERSA_ID });
    });

    socketRef.current.on('chatHistory', (msgs) => {
      setMessages(msgs.map((m) => `(${m.criado_em}) ${m.conteudo}`));
    });

    socketRef.current.on('newMessage', (msg) => {
      setMessages((prev) => [...prev, `(${msg.criado_em}) ${msg.conteudo}`]);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('❌ Erro de conexão:', err.message);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (input.trim() !== '') {
      socketRef.current.emit('sendMessage', {
        conversa_id: CONVERSA_ID,
        conteudo: input,
        tipo: 'texto'
      });
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Chat em tempo real</h1>

      <div
        style={{
          border: '1px solid #ccc',
          padding: '1rem',
          height: '300px',
          overflowY: 'auto',
          marginBottom: '1rem',
        }}
      >
        {messages.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
      </div>

      <input
        type="text"
        placeholder="Digite sua mensagem"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ width: '70%', marginRight: '1rem' }}
      />
      <button onClick={sendMessage}>Enviar</button>
    </div>
  );
}
