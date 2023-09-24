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

  io.on("connection", (socket) => {
    console.log("socket connect successful");

    users.push(socket.id);

    socket.on("newConnect", () => {
      socket.broadcast.emit("echo");
    });

    socket.on("videoVariant", (videoObject) => {
      socket.broadcast.emit("newVideo", {
        video: videoObject.video,
        poster: videoObject.poster,
      });
    });

    socket.on("disconnect", () => {});
  });
};

module.exports = socketServer;
