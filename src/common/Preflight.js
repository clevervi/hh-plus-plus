// A contract is something the script assumes the game page hands it. The game
// has moved these between window and window.shared more than once, and each time
// the script died deep inside a module with a TypeError naming a mangled
// variable. Checking the contracts up front turns that into one readable line
// that says which side of the boundary broke.

// Mirrors how the rest of the script reaches game state: newer builds namespace
// everything under window.shared, older ones put it straight on window.
const resolve = (namespace) => {
    const {shared} = window
    if (!namespace) { return shared || window }
    return shared ? shared[namespace] : window
}

// Deliberately limited to what every page needs. Page-specific globals such as
// opponent_fighter or labyrinth_data are absent by design most of the time, and
// reporting those would train everyone to ignore this.
const CONTRACTS = [
    {name: 'jQuery ($)', get: () => window.$},
    {name: 'GT.design', get: () => window.GT.design},
    {name: 'GT.caracs', get: () => window.GT.caracs},
    {name: 'Hero.infos', get: () => resolve().Hero.infos},
    {name: 'Hero.energies', get: () => resolve().Hero.energies},
    {name: 'Hero.update', get: () => resolve().Hero.update},
    {name: 'shared.timer.createTimer', get: () => resolve('timer').createTimer},
    {name: 'shared.timer.format_time_short', get: () => resolve('timer').format_time_short},
]

class Preflight {
    static check () {
        const missing = CONTRACTS
            .filter(({get}) => {
                try {
                    return !get()
                } catch {
                    // A throw here means an ancestor is gone, which is a miss too.
                    return true
                }
            })
            .map(({name}) => name)

        if (missing.length) {
            console.warn(
                `HH++: the game page is missing ${missing.length} of ${CONTRACTS.length} things this script expects: ${missing.join(', ')}. `
                + 'Features that rely on them will be skipped; see window.HHPlusPlus.Guard.getFailures().'
            )
        }

        return missing
    }
}

export default Preflight
window.HHPlusPlus.Preflight = Preflight
