const path = require('path');

module.exports = {
  entry: './src/browser.ts',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.browser.json'
          }
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/parser': path.resolve(__dirname, 'src/parser'),
      '@/emitter': path.resolve(__dirname, 'src/emitter')
    }
  },
  output: {
    filename: 'python2igcse.min.js',
    path: path.resolve(__dirname, 'dist/browser'),
    library: 'Python2IGCSE',
    libraryTarget: 'umd',
    globalObject: 'this',
    clean: true
  },
  optimization: {
    minimize: true
  },
  devtool: 'source-map',
  target: 'web'
};