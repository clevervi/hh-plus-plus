const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')
const pkg = require('../package.json')

const read = (name) => {
    const file = path.join(root, 'dist', name)
    assert.ok(fs.existsSync(file), `${name} is missing - run "npm run build-all" first`)
    return fs.readFileSync(file, 'utf8')
}

// dist artifacts and the template can carry different line endings depending on
// the checkout's autocrlf setting, which says nothing about the metadata itself.
const normalise = (text) => text.split('\r\n').join('\n')

const metaBlockOf = (source) => {
    const match = source.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/)
    assert.ok(match, 'no userscript metadata block found')
    return match[0]
}

const directives = (block) => {
    const found = {}
    for (const line of block.split(/\r?\n/)) {
        const m = line.match(/^\/\/\s+@(\S+)\s+(.*)$/)
        if (!m) continue
        found[m[1]] = (found[m[1]] || []).concat(m[2].trim())
    }
    return found
}

const bundles = ['hh-plus-plus.user.js', 'hh-plus-plus.dev.user.js']

for (const name of bundles) {
    test(`${name} is syntactically valid JavaScript`, () => {
        // Compiles without running: catches a minifier or bundler regression that
        // would otherwise only surface in the browser.
        assert.doesNotThrow(() => new vm.Script(read(name), { filename: name }))
    })

    test(`${name} has exactly one userscript metadata block`, () => {
        const source = read(name)
        assert.equal(source.split('==UserScript==').length - 1, 1)
        assert.equal(source.split('==/UserScript==').length - 1, 1)
    })

    test(`${name} metadata block starts the file`, () => {
        // Tampermonkey only reads the block when it is at the very top.
        assert.ok(read(name).startsWith('// ==UserScript=='))
    })

    test(`${name} declares the directives the loader depends on`, () => {
        const found = directives(metaBlockOf(read(name)))
        for (const key of ['name', 'description', 'version', 'run-at', 'grant', 'namespace']) {
            assert.ok(found[key], `missing @${key}`)
        }
        assert.equal(found['run-at'][0], 'document-body')
        assert.equal(found.grant[0], 'none')
    })

    test(`${name} version matches package.json`, () => {
        const found = directives(metaBlockOf(read(name)))
        assert.equal(found.version[0], pkg.version)
    })
}

test('dist metadata file matches the bundled metadata block', () => {
    assert.equal(normalise(metaBlockOf(read('hh-plus-plus.meta.js'))), normalise(metaBlockOf(read('hh-plus-plus.user.js'))))
})

test('every @match from the template survives into the build', () => {
    const template = fs.readFileSync(path.join(root, 'build', 'hh-plus-plus.meta.template.js'), 'utf8')
    const expected = directives(metaBlockOf(template)).match
    const actual = directives(metaBlockOf(read('hh-plus-plus.user.js'))).match
    assert.deepEqual(actual, expected)
    assert.ok(expected.length > 0, 'template declares no @match')
})

test('svg assets are inlined rather than emitted as separate files', () => {
    const svgCount = fs.readdirSync(path.join(root, 'src', 'assets')).filter((f) => f.endsWith('.svg')).length
    const inlined = new Set(read('hh-plus-plus.user.js').match(/data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+/g) || [])
    assert.equal(inlined.size, svgCount)
})
