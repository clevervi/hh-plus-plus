const test = require('node:test')
const assert = require('node:assert/strict')

const { loadBundle } = require('./support/game-page.js')

test('the userscript exposes its helpers on window.HHPlusPlus', () => {
    const { api } = loadBundle()
    for (const key of ['Guard', 'Preflight', 'Helpers', 'Sheet', 'I18n', 'Simulator', 'SimHelpers']) {
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
