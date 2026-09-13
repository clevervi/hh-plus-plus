// The script runs inside a game it does not control, so a field the game renames
// can make any single collector or module throw. Until this existed, that throw
// escaped the top-level chain and nothing after it ran, the config panel
// included, which turned one broken feature into a dead script.
const failures = []

class Guard {
    static run (name, fn) {
        try {
            return fn()
        } catch (error) {
            failures.push({name, error})
            // Loud on purpose: an isolated failure is still a failure, and the
            // name is what makes a bug report actionable.
            console.error(`HH++: "${name}" threw and was skipped. The rest of the script keeps running.`, error)
            return undefined
        }
    }

    static getFailures () {
        return failures.map(({name, error}) => ({name, error}))
    }
}

export default Guard
window.HHPlusPlus.Guard = Guard
