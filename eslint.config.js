const js = require('@eslint/js')
const globals = require('globals')

// Globals injected into the page by the game itself. The userscript reads them
// but never declares them, so they have to be listed here to keep no-undef useful.
const gameGlobals = {
    blessings: 'readonly',
    cycle_end_in_seconds: 'readonly',
    girl_rewards: 'readonly',
    GIRL_MAX_LEVEL: 'readonly',
    labyrinth_data: 'readonly',
    love_raids: 'readonly',
    opponent_fighter: 'readonly',
    setRounds: 'readonly',
}

const styleRules = {
    eqeqeq: 'warn',
    strict: ['error', 'never'],
    quotes: ['error', 'single'],
    semi: ['error', 'never'],
    'no-var': 'error',
    indent: ['warn', 4],
    'eol-last': 'warn',
    'no-trailing-spaces': 'warn',
    // Advisory, like the rules above: these flag dead stores and leftover
    // debug helpers that are deliberately kept in the source, so they must
    // stay visible without failing the build.
    'no-unused-vars': 'warn',
    'no-useless-assignment': 'warn',
}

module.exports = [
    {
        ignores: ['dist/**', 'build/*.template.js'],
    },
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.jquery,
                ...globals.greasemonkey,
                ...gameGlobals,
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            ...styleRules,
        },
    },
    {
        files: ['build/**/*.js', 'test/**/*.js', 'webpack.config.js', 'eslint.config.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: globals.node,
        },
        rules: {
            ...js.configs.recommended.rules,
            ...styleRules,
        },
    },
]
