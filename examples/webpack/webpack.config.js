const webpack = require('webpack')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const path = require('path')
const transformInferno = require('ts-plugin-inferno').default

module.exports = {
  entry: './src/index.tsx',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist/'),
    filename: 'bundle.js',
  },
  resolve: {
    mainFields: ['main'], // Important so Webpack resolves the main field of package.json for Classcat
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx$/,
        loader: 'ts-loader',
        options: {
          getCustomTransformers: () => ({
            before: [transformInferno()],
          }),
        },
      },
      {
        test: /\.ts$/,
        loader: 'ts-loader',
      },
    ],
  },
  devServer: {
    historyApiFallback: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      inject: 'body',
    }),
    new CleanWebpackPlugin({
      verbose: true,
    })
  ],
}
