const { defineConfig } = require('@vue/cli-service');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    plugins: [new MonacoWebpackPlugin()],
  },
  devServer: {
    proxy: {
      '/backend': {
        target: 'http://127.0.0.1:5000', // 5000是flask debug时的端口，正常启动是app.run port的端口
        ws: true,
        changeOrigin: true,
        pathRewrite: {
          '^/backend/(.*)': '/$1',
        },
      },
    },
  },
});
