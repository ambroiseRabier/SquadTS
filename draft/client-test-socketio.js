// To be used in another folder: npm init, npm i socket.io-client, node client-test.socketio.js

const { io } = require('socket.io-client');

const dns = require('dns');
const util = require('util');
const lookup = util.promisify(dns.lookup);

// lookup('localhost').then(data => console.log(data.address)) // ::1 ?
// lookup('127.0.0.1').then(data => console.log(data.address)) // ?
lookup('172.17.48.1').then(data => console.log(data.address)); // pareil !
//lookup('https://www.github.com/').then(data => console.log(data.address)) // error

// Même IPV4 avec ipconfig qui ne change pas, fonctionne ici mais pas sur whitelister.

// Whitelister release with docker-compose, network host or not.
// localhost or host.docker.internal or 127.0.0.1 or IPV4 (172.17.48.1)
// no success in any, maybe it only work with a domain name?
// Whatever is the issue, this script works fine

// Server URL and configuration
const SERVER_URL = `ws://localhost:3000`; // Replace YOUR_SERVER_PORT with the server's port

// Connect to the Socket.IO server with authentication
const socket = io(SERVER_URL, {
  auth: {
    token: 'secu', // The password for authentication
  },
});

// Handle connection success
socket.on('connect', () => {
  console.log('Connected to the server!');
  console.log('Socket ID:', socket.id);

  socket.emit('rcon.warn', { steamID: '76561198037846568', message: 'test' }, (err, response) => {
    console.log('rcon.warn:', err, response);
  });
  socket.emit('rcon.getListPlayers', undefined, (err, response) => {
    console.log('rcon.getListPlayers:', err, response);
  });
});

// Handle authentication errors
socket.on('connect_error', err => {
  console.error('Connection error:', err.message);
});

// Handle PLAYER_CONNECTED event
socket.on('PLAYER_CONNECTED', data => {
  console.log('Player connected:', data);
});

// Handle PLAYER_DISCONNECTED event
socket.on('PLAYER_DISCONNECTED', data => {
  console.log('Player disconnected:', data);
});

// Handle CHAT_MESSAGE event
socket.on('CHAT_MESSAGE', data => {
  console.log('Chat message:', data.message);
});

// Handle server disconnect
socket.on('disconnect', reason => {
  console.log('Disconnected:', reason);
});
