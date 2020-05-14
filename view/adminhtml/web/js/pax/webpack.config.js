const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin
const WebpackManifestGeneratorPlugin = require('webpack-manifest-generator-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin').CleanWebpackPlugin
const webpack = require('webpack')
const WebpackBar = require('webpackbar')
const url = require('url')
const _ = require('lodash')
const fs = require('fs')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const paxConfig = require('./pax.config')
require('dotenv').config()

const polyfill =  !_.isUndefined(paxConfig.polyfill) ? paxConfig.polyfill : true

const isWin = process.platform === "win32";

const host = process.env.HOST || 'localhost'
const port = process.env.PORT || '3000'
const analyzer = process.env.ANALYZER || false
const siteUrl = process.env.SITE_URL

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development'

  const currentUrl = siteUrl

  const distRelativePath = getDistRelativePath()

  const rewriteUrl = url.parse(currentUrl)
  const proxyUrl = 'http://' + host + ':' + port + rewriteUrl.path
  const publicPath = isDev
    ? '/'
    : '/' + distRelativePath.replace(/\\/g, '/')

  const publicRelativePath = distRelativePath.replace(/\\/g, '/')
  let rewriteUrls = {}
  rewriteUrls[currentUrl] = ''
  rewriteUrls['^' + rewriteUrl.path] = ''

  const plugins = []

  if (isDev) {
    if (analyzer) {
      plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: 'stat/index.html',
          logLevel: 'silent'
        })
      )
    }
    plugins.push(
      new HtmlWebpackPlugin({
          template: path.resolve(__dirname, 'index.html'),
          templateParameters: {
            env: process.env
          },
          inject: 'head'
        })
    )
  }

  let entry = []

  if(polyfill) {
    entry = [...entry, '@babel/polyfill']
  }
  return {
    entry: [...entry, path.resolve(__dirname, './core/main.js')],
    output: {
      path: path.resolve(__dirname, `../${paxConfig.codename}/`),
      // filename: '[hash].bundle.js',
      filename: 'custom.js',
      publicPath: publicPath
    },
    resolve: {
      extensions: ['*', '.js', '.vue', '.json', '.gql'],
      alias: {
        '~': path.resolve(__dirname, './'),
        assets: path.resolve(__dirname, './assets'),
        vue$: 'vue/dist/vue.esm.js'
      }
    },
    performance: {
      hints: false
    },
    devServer: {
      contentBase: path.resolve(__dirname, `../${paxConfig.codename}/index.html`),
      open: true,
      host: host,
      port: port,
      overlay: {
        errors: true,
        warnings: false
      },
      open: false,
      hotOnly: true,
      historyApiFallback: true,
      compress: false
    },
    stats: {
      colors: true,
      hash: false,
      version: true,
      timings: true,
      assets: true,
      chunks: false,
      modules: false,
      reasons: false,
      children: false,
      source: false,
      errors: true,
      errorDetails: false,
      warnings: true,
      publicPath: false
    },
    watch: argv.mode === 'development',
    module: {
      rules: [
        {
          resourceQuery: /blockType=i18n/,
          type: 'javascript/auto',
          loader: '@kazupon/vue-i18n-loader',
        },
        {
          test: /\.(graphql|gql)$/,
          use: 'graphql-tag/loader'
        },
        {
          test: /\.vue$/,
          loader: 'vue-loader',
          options: {
            extractCSS: true
          }
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: ['babel-loader']
        },
        {
          test: /\.css$/,
          use: [
            argv.mode === 'development'
              ? 'vue-style-loader'
              : MiniCssExtractPlugin.loader,
            'css-loader'
          ]
        },
        {
          test: /\.(pcss|postcss)$/,
          use: [
            argv.mode === 'development'
              ? 'vue-style-loader'
              : MiniCssExtractPlugin.loader,
            'css-loader',
            'postcss-loader'
          ]
        },
        {
          test: /\.scss$/,
          use: [
            argv.mode === 'development'
              ? 'vue-style-loader'
              : MiniCssExtractPlugin.loader,
            'css-loader',
            'postcss-loader',
            'sass-loader',
            {
              loader: 'sass-resources-loader',
              options: {
                resources: [
                  path.resolve(__dirname, './assets/scss/_colors.scss'),
                  path.resolve(__dirname, './assets/scss/_variables.scss')
                ]
              }
            }
          ]
        },
        {
          test: /\.(png|jpe?g|gif|svg|webp)$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 80192,
                esModule: false,
                fallback: 'file-loader',
                context: path.resolve(__dirname, './assets'),
                outputPath: './',
                publicPath: '../'+publicRelativePath,
                name: '[path][name].[ext]'
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'custom.css'
      }),
      new VueLoaderPlugin(),
      new WebpackManifestGeneratorPlugin({
        filename: 'manifest.json'
      }),
      new WebpackBar(),
      new CleanWebpackPlugin({
        root: path.resolve(__dirname, '../'),
        verbose: true,
        dry: false,
        watch: false
      }),
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      ...plugins
    ]
  }
}

const getRootDir = () => {
  let configFile = false
  let currentDir = false
  do {
    currentDir = currentDir
      ? path.resolve(currentDir, '../')
      : path.resolve(__dirname, '../')
    configFile = fs.existsSync(path.resolve(currentDir, './app'))
  } while (!configFile)

  return currentDir
}

const getDistRelativePath = () => {
  const cDir = path.resolve(getRootDir(), './')
  const nDir = path.resolve(__dirname, `../${paxConfig.codename}/`)

  if(isWin) {
    return _.replace(nDir, cDir + '\\', '')
  } else {
    return _.replace(nDir, cDir + '/', '')
  }
}
