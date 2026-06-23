const { io } = require('socket.io-client');

const socket = io('http://localhost:5000', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMzUxY2EwZDgxZjNiNjRmNTIxMjFiYiIsImlhdCI6MTc4MTk2NDEzNSwiZXhwIjoxNzgyNTY4OTM1fQ.iwFWaWVizJqLRDZeP1kYJ-ICW9CmIl9iwHY02vmBPhk',
  },
});

socket.on('connect', () => {
  console.log('Connected to server. Socket ID:', socket.id);
});

socket.on('orderFilled', (data) => {
  console.log('Received orderFilled event:', data);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});