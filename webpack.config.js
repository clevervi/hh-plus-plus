const path = require('path')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const BannerBuilder = require('./build/BannerBuilder')

const banner = BannerBuilder.buildBanner()

const config = {
    mode: 'production',
    entry: './src/index.js',
    output: {
        filename: 'hh-plus-plus.user.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.svg$/i,
                type: 'asset',
                parser: {
                    dataUrlCondition: {
                        maxSize: 8192,
                    },
                },
            },
            {
                test: /\.lazy\.scss$/i,
                use: [
                    { loader: 'style-loader', options: { injectType: 'lazyStyleTag', attributes: { class: 'script-styles' } } },
                    'css-loader',
                    'sass-loader',
                ],
            },
        ]
    },
    optimization: {
        minimizer: [
            new TerserPlugin({
                parallel: true,
                // The userscript metadata block must survive minification, so all
                // other comments are stripped and the banner is re-added verbatim.
                extractComments: false,
                terserOptions: {
                    format: {
                        beautify: false,
                        comments: false,
                        preamble: banner,
                    },
                },
            }),
        ],
    },
    plugins: [
        new webpack.BannerPlugin({
            banner,
            raw: true,
            entryOnly: true
        })
    ]
}

module.exports = (env, argv) => {

    if (argv.mode === 'development') {
        config.output.filename = 'hh-plus-plus.dev.user.js'
    }

    return config
}
