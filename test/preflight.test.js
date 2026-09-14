const test = require('node:test')
const assert = require('node:assert/strict')

const { loadBundle } = require('./support/game-page.js')

const hero = { infos: {}, energies: {}, update: () => {} }
const timer = { createTimer: () => {}, format_time_short: () => {} }
const GT = { design: {}, caracs: {} }

// The shape the game used before it namespaced everything.
const legacyPage = { $: () => {}, GT, Hero: hero, ...timer }

// The shape it uses now. The script has had to support both since the game's
// bundler moved things, which is the failure this check exists to catch.
const sharedPage = { $: () => {}, GT, shared: { Hero: hero, timer } }

test('a page with everything reports nothing missing', () => {
    const { missing, warnings } = loadBundle(sharedPage)
    assert.deepEqual(missing(), [])
    assert.deepEqual(warnings, [])
})

test('the legacy window layout is still accepted', () => {
    // Regression guard: dropping support here would silently break older builds.
    assert.deepEqual(loadBundle(legacyPage).missing(), [])
})

test('a bare page reports every contract rather than throwing', () => {
    const reported = loadBundle({}).missing()
    assert.ok(reported.includes('jQuery ($)'))
    assert.ok(reported.includes('GT.design'))
    assert.ok(reported.includes('Hero.infos'))
    assert.ok(reported.includes('shared.timer.createTimer'))
})

test('a missing sub-key is named without taking the check down', () => {
    const { missing } = loadBundle({ ...sharedPage, GT: { caracs: {} } })
    assert.deepEqual(missing(), ['GT.design'])
})

test('the game moving Hero out from under shared is caught', () => {
    const { missing, warnings } = loadBundle({ ...sharedPage, shared: { timer } })
    assert.deepEqual(missing(), ['Hero.infos', 'Hero.energies', 'Hero.update'])

    missing()
    assert.equal(warnings.length, 2, 'each check warns once')
    assert.match(warnings[0], /Hero\.infos/)
    assert.match(warnings[0], /getFailures/)
})

// The config panel reads the result back rather than re-running the check,
// because a second run would warn again for the same thing every time the
// player opens the panel.

test('the result is readable again without warning a second time', () => {
    const { missing, warnings, api } = loadBundle({ ...sharedPage, shared: { timer } })

    const first = missing()
    assert.equal(warnings.length, 1)

    assert.deepEqual(Array.from(api.Preflight.getMissing()), first)
    assert.deepEqual(Array.from(api.Preflight.getMissing()), first)
    assert.equal(warnings.length, 1, 'reading the result must not warn again')
})

test('an intact page has nothing to report back', () => {
    const { api, missing } = loadBundle(sharedPage)
    missing()
    assert.deepEqual(Array.from(api.Preflight.getMissing()), [])
})

test('the caller cannot corrupt the stored result', () => {
    const { api, missing } = loadBundle({ ...sharedPage, shared: { timer } })
    missing()

    api.Preflight.getMissing().push('not real')

    assert.deepEqual(Array.from(api.Preflight.getMissing()), ['Hero.infos', 'Hero.energies', 'Hero.update'])
})
