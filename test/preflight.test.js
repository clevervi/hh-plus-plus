const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const bundle = fs.readFileSync(path.resolve(__dirname, '..', 'dist', 'hh-plus-plus.user.js'), 'utf8')

// Loads the userscript against a fake game page. Whatever `page` provides stands
// in for what the real game would have put on window by the time the script runs.
const loadAgainst = (page) => {
    const warnings = []
    const sandbox = {
        console: { log: () => {}, error: () => {}, warn: (...args) => warnings.push(String(args[0])) },
        location: { pathname: '/home.html', hostname: 'www.hentaiheroes.com', search: '', href: '' },
        document: {
            documentElement: { lang: 'en' },
            // The script treats a present loading-overlay as "page still loading,
            // do nothing", which registers its globals and stops before touching
            // the DOM. That is exactly the state this suite needs.
            getElementById: (id) => (id === 'loading-overlay' ? {} : null),
            addEventListener: () => {},
        },
        navigator: { userAgent: 'node' },
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        ...page,
    }
    sandbox.window = sandbox
    sandbox.globalThis = sandbox
    vm.runInNewContext(bundle, sandbox, { filename: 'hh-plus-plus.user.js' })
    return {
        warnings,
        missing: () => Array.from(sandbox.window.HHPlusPlus.Preflight.check()),
    }
}

const hero = { infos: {}, energies: {}, update: () => {} }
const timer = { createTimer: () => {}, format_time_short: () => {} }
const GT = { design: {}, caracs: {} }

// The shape the game used before it namespaced everything.
const legacyPage = { $: () => {}, GT, Hero: hero, ...timer }

// The shape it uses now. The script has had to support both since the game's
// bundler moved things, which is the failure this check exists to catch.
const sharedPage = { $: () => {}, GT, shared: { Hero: hero, timer } }

test('a page with everything reports nothing missing', () => {
    const { missing, warnings } = loadAgainst(sharedPage)
    assert.deepEqual(missing(), [])
    assert.deepEqual(warnings, [])
})

test('the legacy window layout is still accepted', () => {
    // Regression guard: dropping support here would silently break older builds.
    assert.deepEqual(loadAgainst(legacyPage).missing(), [])
})

test('a bare page reports every contract rather than throwing', () => {
    const { missing } = loadAgainst({})
    const reported = missing()
    assert.ok(reported.includes('jQuery ($)'))
    assert.ok(reported.includes('GT.design'))
    assert.ok(reported.includes('Hero.infos'))
    assert.ok(reported.includes('shared.timer.createTimer'))
})

test('a missing sub-key is named without taking the check down', () => {
    const { missing } = loadAgainst({ ...sharedPage, GT: { caracs: {} } })
    assert.deepEqual(missing(), ['GT.design'])
})

test('the game moving Hero out from under shared is caught', () => {
    const { missing, warnings } = loadAgainst({ ...sharedPage, shared: { timer } })
    assert.deepEqual(missing(), ['Hero.infos', 'Hero.energies', 'Hero.update'])

    missing()
    assert.equal(warnings.length, 2, 'each check warns once')
    assert.match(warnings[0], /Hero\.infos/)
    assert.match(warnings[0], /getFailures/)
})
