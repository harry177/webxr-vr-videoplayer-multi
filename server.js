const path = require("path");
const http = require("http");
const express = require("express");
const socketServer = require("./socketServer");

const app = express();

app.use(express.static(path.resolve(__dirname, "dist")));


app.get("/", (req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
  });

const port = process.env.PORT || 8080;

const superServer = app.listen(port);
socketServer(superServer, port);

/*http.createServer(app).listen(port, () => {
  console.log(`Server listening on port ${port}`);
});*/
