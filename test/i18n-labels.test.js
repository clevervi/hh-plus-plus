const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const labelsDir = path.resolve(__dirname, '..', 'src', 'i18n', 'labels')
const indexFile = path.resolve(__dirname, '..', 'src', 'i18n', 'index.js')

const lines = (file) => fs.readFileSync(file, 'utf8').split('\n').map((line) => line.trim())

// The label files are plain data modules, so the exported namespace names can be
// read straight off the source without pulling in the browser-only imports.
const namespacesOf = (file) => lines(file)
    .filter((line) => line.startsWith('export const '))
    .map((line) => line.slice('export const '.length).split(' ')[0])
    .sort()

const localeFiles = fs.readdirSync(labelsDir).filter((f) => f.endsWith('.js'))
const DEFAULT_LOCALE = 'En.js'

const registeredLocales = () => {
    const line = lines(indexFile).find((l) => l.startsWith('const labels = {'))
    assert.ok(line, 'could not find the labels registry in src/i18n/index.js')
    return line.slice(line.indexOf('{') + 1, line.lastIndexOf('}'))
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length && !part.startsWith('/*'))
        .sort()
}

test('every label file is registered in the i18n index', () => {
    const onDisk = localeFiles.map((f) => f.replace('.js', '').toLowerCase()).sort()
    assert.deepEqual(registeredLocales(), onDisk)
})

test('the default locale is the first registered one', () => {
    // I18n falls back to supportedLanguages[0], so English has to come first.
    const order = lines(indexFile).find((l) => l.startsWith('const labels = {'))
    assert.ok(order.indexOf('en') < order.indexOf('fr'), 'en must be registered first')
})

const base = namespacesOf(path.join(labelsDir, DEFAULT_LOCALE))

test('the default locale exports at least one namespace', () => {
    assert.ok(base.length > 0)
})

for (const file of localeFiles.filter((f) => f !== DEFAULT_LOCALE)) {
    test(`${file} declares no namespace that ${DEFAULT_LOCALE} lacks`, (t) => {
        const own = namespacesOf(path.join(labelsDir, file))
        // An orphan namespace can never be reached: lookups fall back to English,
        // so anything not present there is dead translation work.
        const orphans = own.filter((name) => !base.includes(name))
        assert.deepEqual(orphans, [], `orphan namespaces in ${file}: ${orphans.join(', ')}`)

        const missing = base.filter((name) => !own.includes(name))
        if (missing.length) {
            t.diagnostic(`${file} falls back to English for: ${missing.join(', ')}`)
        }
    })
}
