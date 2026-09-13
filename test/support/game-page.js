const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const bundle = fs.readFileSync(path.resolve(__dirname, '..', '..', 'dist', 'hh-plus-plus.user.js'), 'utf8')

// Evaluates the built userscript against a fake game page. Whatever `page`
// provides stands in for what the real game would have put on window by the time
// the script runs. A present loading-overlay makes the script treat the page as
// still loading, so it registers its globals and stops before touching the DOM.
const loadBundle = (page = {}) => {
    const errors = []
    const warnings = []
    const sandbox = {
        console: {
            log: () => {},
            error: (...args) => errors.push(args),
            warn: (...args) => warnings.push(String(args[0])),
            dir: () => {},
            group: () => {},
            groupCollapsed: () => {},
            groupEnd: () => {},
        },
        location: { pathname: '/home.html', hostname: 'www.hentaiheroes.com', search: '', href: '' },
        document: {
            documentElement: { lang: 'en' },
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

    const api = sandbox.window.HHPlusPlus
    return {
        api,
        errors,
        warnings,
        // Values built inside the sandbox belong to another realm, so copy them
        // out before comparing or strict deepEqual trips on the prototype.
        failures: () => Array.from(api.Guard.getFailures()).map(({ name, error }) => ({ name, error })),
        missing: () => Array.from(api.Preflight.check()),
    }
}

module.exports = { loadBundle }
