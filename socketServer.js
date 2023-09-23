const { Server } = require('socket.io');
const http = require("http");

const socketServer = (server, port) => {
    const io = new Server(server, {
      cors: {
        origin: '*',
      },
    });
    console.log(`Server started on port ${port}`);
  
  
    const users = [];
    let videoCurrent;

    io.on('connection', (socket) => {
        console.log('socket connect successful');

        users.push(socket.id);
    
        socket.on('newConnect', () => {
            
            socket.broadcast.emit('echo');
        });

        socket.on('videoVariant', (video) => {
            videoCurrent = video;
            socket.broadcast.emit('newVideo', videoCurrent);
            
        })

        socket.on('disconnect', () => {
            
          });
    })
}

module.exports = socketServer;