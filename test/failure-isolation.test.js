const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const bundle = fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'hh-plus-plus.user.js'), 'utf8')

// Evaluates the built userscript in a bare sandbox. Without jQuery on the fake
// window the script registers its globals and then bails out before touching the
// page, which is exactly far enough to exercise what it exposes.
const loadBundle = () => {
    const errors = []
    const sandbox = {
        console: { log: () => {}, warn: () => {}, error: (...args) => errors.push(args) },
        location: { pathname: '/home.html', hostname: 'www.hentaiheroes.com', search: '', href: '' },
        document: { documentElement: { lang: 'en' }, getElementById: () => null, addEventListener: () => {} },
        navigator: { userAgent: 'node' },
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
    }
    sandbox.window = sandbox
    sandbox.globalThis = sandbox
    vm.runInNewContext(bundle, sandbox, { filename: 'hh-plus-plus.user.js' })
    const api = sandbox.window.HHPlusPlus
    // Arrays built inside the sandbox belong to another realm, so copy them
    // out before comparing or strict deepEqual trips on the prototype.
    const failures = () => Array.from(api.Guard.getFailures()).map(({ name, error }) => ({ name, error }))
    return { api, errors, failures }
}

test('the userscript exposes its helpers on window.HHPlusPlus', () => {
    const { api } = loadBundle()
    for (const key of ['Guard', 'Helpers', 'Sheet', 'I18n']) {
        assert.ok(api[key], `window.HHPlusPlus.${key} is missing`)
    }
})

test('Guard returns the value of a call that succeeds', () => {
    const { api, errors, failures } = loadBundle()
    assert.equal(api.Guard.run('ok', () => 'value'), 'value')
    assert.deepEqual(errors, [])
    assert.deepEqual(failures(), [])
})

test('Guard contains a throw instead of letting it escape', () => {
    const { api } = loadBundle()
    const boom = new Error('the game renamed a field')
    assert.doesNotThrow(() => api.Guard.run('BrokenCollector', () => { throw boom }))
    assert.equal(api.Guard.run('BrokenCollector', () => { throw boom }), undefined)
})

test('Guard reports the name of what failed', () => {
    const { api, errors, failures } = loadBundle()
    api.Guard.run('BrokenCollector', () => { throw new Error('nope') })

    assert.equal(errors.length, 1, 'a contained failure must still be logged')
    assert.match(String(errors[0][0]), /BrokenCollector/)

    const recorded = failures()
    assert.equal(recorded.length, 1)
    assert.equal(recorded[0].name, 'BrokenCollector')
    assert.equal(recorded[0].error.message, 'nope')
})

test('one failure does not stop the work queued behind it', () => {
    const { api, failures } = loadBundle()
    const ran = []
    const steps = [
        ['first', () => ran.push('first')],
        ['broken', () => { throw new Error('game update') }],
        ['third', () => ran.push('third')],
    ]

    steps.forEach(([name, step]) => api.Guard.run(name, step))

    // The regression this guards against: before isolation, 'third' never ran.
    assert.deepEqual(ran, ['first', 'third'])
    assert.deepEqual(failures().map((f) => f.name), ['broken'])
})
