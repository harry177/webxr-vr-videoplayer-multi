const { Server } = require("socket.io");

const socketServer = (server, port) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });
  console.log(`Server started on port ${port}`);

  const users = [];
  const chat = [];
  let entryArray = [];
  let loaderArray = [];

  io.on("connection", (socket) => {
    console.log("socket connect successful");

    socket.on("newConnect", () => {
      users.push(socket.id);
      socket.broadcast.emit("echo");
      io.to(socket.id).emit("updateChat", chat);
    });

    socket.on("newJoined", (videoObject) => {
      entryArray.push({ user: socket.id, videoData: videoObject });
      if (entryArray.length === users.length - 1) {
        const missingUser = users.find(
          (el) => !entryArray.some((obj) => obj.user === el)
        );
        console.log(missingUser);
        //io.to(missingUser).emit('videoData', entryArray[0].videoData);
        io.emit("newVideo", entryArray[0].videoData);
        //io.emit('videoData', entryArray[0].videoData);

        entryArray = [];
      }
    });

    socket.on("newIsReady", () => {
      io.emit("avengersAssemble");
    });

    socket.on("videoVariant", (videoObject) => {
      io.emit("newVideo", {
        video: videoObject.video,
        poster: videoObject.poster,
        time: videoObject.time,
      });
    });

    socket.on("play", () => {
      io.emit("playConfirm");
    });

    socket.on("pause", () => {
      io.emit("pauseConfirm");
    });

    socket.on("sendMessage", (message) => {
      chat.push({ message: message, id: socket.id });
      console.log(chat);
      
      for (let i = 0; i < chat.length; i++) {
        const handledChat = chat.map((obj) => ({ ...obj }));
         handledChat.map((el) => {
          if (el.id === chat[i].id) {
            el.id = 1;
          }
          return el;
        });
        console.log(handledChat);
        console.log(chat[i].id);
        io.to(chat[i].id).emit("updateChat", handledChat);
      }
      //io.emit("updateChat", chat);
    });

    socket.on("ping", () => {
      console.log("ping");
      loaderArray.push(socket.id);
      if (loaderArray.length === users.length) {
        io.emit("pong");

        loaderArray = [];
        console.log("pong");
      }
    });

    socket.on("disconnect", () => {
      const index = users.indexOf(socket.id);
      if (index !== -1) {
        users.splice(index, 1);
      }
      console.log(`now users are ${users}`);
    });
  });
};

module.exports = socketServer;
