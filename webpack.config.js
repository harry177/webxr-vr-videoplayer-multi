const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');

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
        test: /\.(png|jpe?g|ico|gif|mp4)$/i,
        use: [
          {
            loader: "file-loader",
            options: {
              outputPath: "assets",
              name: '[name].[ext]',
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
    new HtmlWebpackPlugin({
      template: './src/index.html',
      excludeChunks: ['index'],
      favicon: './assets/favicon.ico'
    }),
  ],
  devServer: {
    allowedHosts: [
      ".ngrok-free.app",
    ],
  },
};
