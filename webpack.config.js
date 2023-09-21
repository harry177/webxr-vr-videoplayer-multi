const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "none",
  performance: {
    hints: false,
  },
  entry: "./src/index.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|mp4)$/i,
        use: [
          {
            loader: "file-loader",
            options: {
              outputPath: "assets",
            },
          },
        ],
      },
      {
        test: /\.json$/,
        use: 'json-loader',
        type: 'javascript/auto'
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "./src/index.html", to: "index.html" }],
    }),
  ],
  devServer: {
    allowedHosts: [
      ".ngrok-free.app",
    ],
  },
};
