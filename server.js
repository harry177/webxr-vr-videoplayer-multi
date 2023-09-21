const path = require("path");
const express = require("express");

const app = express();

// Serve static files from the 'dist' directory
app.use(express.static(path.resolve(__dirname, "dist")));


app.get("/", (req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
  });

// Start the server
const port = process.env.PORT || 8080; // Use the desired port number

http.createServer(app).listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
