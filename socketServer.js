const { Server } = require("socket.io");
const http = require("http");

const socketServer = (server, port) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });
  console.log(`Server started on port ${port}`);

  const users = [];
  const chat = [];

  io.on("connection", (socket) => {
    console.log("socket connect successful");

    users.push(socket.id);

    socket.on("newConnect", () => {
      socket.broadcast.emit("echo");
    });

    socket.on("videoVariant", (videoObject) => {
      io.emit("newVideo", {
        video: videoObject.video,
        poster: videoObject.poster,
        time: videoObject.time,
      });
    });

    socket.on('play', () => {
      io.emit('playConfirm');
    });

    socket.on('pause', () => {
      io.emit('pauseConfirm');
    });

    socket.on('sendMessage', (message) => {
      chat.push(message);
      io.emit('updateChat', chat);
    })

    socket.on("disconnect", () => {});
  });
};

module.exports = socketServer;
