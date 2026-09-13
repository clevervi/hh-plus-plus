const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const sass = require('sass')

const { stylesheets } = require('../build/dump-css.js')
const SRC = path.resolve(__dirname, '..', 'src')

const files = stylesheets()

test('lazy stylesheets are discovered', () => {
    assert.ok(files.length > 0, 'no *.lazy.scss found under src/')
})

for (const relative of files) {
    test(`${relative} compiles`, () => {
        // Deprecation warnings are expected while the Sass layer still uses
        // @import, so only a hard compile error should fail here.
        const { css } = sass.compile(path.join(SRC, relative), {
            style: 'compressed',
            logger: sass.Logger.silent,
        })
        assert.equal(typeof css, 'string')
    })
}
