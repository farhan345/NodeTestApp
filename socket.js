const socketIO = require('socket.io');

module.exports = function (server) {
  const io = socketIO(server);

  io.on('connection', (socket) => {
    console.log('Client connected');

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  return io;
};
