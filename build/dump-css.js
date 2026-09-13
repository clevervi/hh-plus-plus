const fs = require('fs')
const path = require('path')
const sass = require('sass')

const SRC = path.resolve(__dirname, '..', 'src')

// Compiles every lazily-injected stylesheet on its own, the same way sass-loader
// does during the build, and prints the result in a stable order. Diffing two
// dumps proves a change to the Sass layer left the emitted CSS untouched.
const stylesheets = () => fs.readdirSync(SRC, { recursive: true })
    .map((entry) => entry.split(path.sep).join('/'))
    .filter((entry) => entry.endsWith('.lazy.scss'))
    .sort()

const dump = () => stylesheets().map((relative) => {
    const { css } = sass.compile(path.join(SRC, relative), { style: 'compressed' })
    return '/* === ' + relative + ' === */\n' + css.trim() + '\n'
}).join('')

module.exports = { stylesheets, dump }

if (require.main === module) {
    process.stdout.write(dump())
}
