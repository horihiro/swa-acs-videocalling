const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './client.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  plugins: [
    // ↓ 追加
    new CopyWebpackPlugin({
      patterns: [{from: 'index.html' }]
    })
  ],

}