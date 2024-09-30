const io = require('socket.io-client');
const socket = io('https://backened.skipaline.com'); // Replace with your server's URL

socket.on('connect', () => {
  console.log('Connected to server');

  // Register a listener for the 'progress' event
  socket.on('progress', (progress) => {
    console.log(`Received progress update: ${progress}%`);
    // Update the progress indicator in your mobile app here
    // You can emit an event or call a function to update the UI
  });


});
