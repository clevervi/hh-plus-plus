const test = require('node:test')
const assert = require('node:assert/strict')

const { loadBundle } = require('./support/game-page.js')

const { Simulator } = loadBundle().api

// `def` is the defence this side has to chew through, so it is the *other*
// fighter's defence stat. League, Season and BDSMPvE all build it that way.
const fighter = (overrides = {}) => ({
    name: 'Opponent',
    hp: 1000,
    atk: 100,
    def: 0,
    atkMult: 1,
    defMult: 1,
    critchance: 0,
    bonuses: { critDamage: 0, healOnHit: 0 },
    ...overrides,
})

// run() mutates both fighters, so every simulation gets its own pair.
const simulate = (player, opponent) => new Simulator({ player: fighter(player), opponent: fighter(opponent) }).run()

test('a fight the player cannot lose is certain', () => {
    const result = simulate({ atk: 99999 }, { hp: 100, atk: 0 })
    assert.equal(result.win, 1)
    assert.equal(result.loss, 0)
    assert.equal(result.avgTurns, 1)
    assert.equal(result.scoreClass, 'plus')
})

test('a fight the player cannot win is certain too', () => {
    const result = simulate({ atk: 1, hp: 10 }, { hp: 100000, atk: 99999 })
    assert.equal(result.win, 0)
    assert.equal(result.loss, 1)
    assert.equal(result.scoreClass, 'minus')
})

test('win and loss always split the whole probability', () => {
    for (const atk of [40, 70, 100, 130, 160]) {
        const { win, loss } = simulate({ atk, critchance: 0.3, bonuses: { critDamage: 0.5, healOnHit: 0.1 } }, {})
        assert.equal(Number((win + loss).toFixed(10)), 1, `atk ${atk} did not sum to 1`)
    }
})

test('the player winning first is worth more points than surviving longest', () => {
    const { points } = simulate({ critchance: 0.4, bonuses: { critDamage: 1, healOnHit: 0.2 } }, { atk: 95 })
    const scored = Object.keys(points).map(Number)
    assert.ok(scored.length > 0)
    for (const point of scored) {
        // A loss scores 3 to 13 and a win 16 to 25, so 14 and 15 cannot happen.
        assert.ok(point >= 3 && point <= 25, `${point} is outside the scoring range`)
        assert.ok(point !== 14 && point !== 15, `${point} is in the gap between losing and winning`)
    }
})

test('hitting harder never lowers the odds', () => {
    let previous = -1
    for (const atk of [60, 80, 100, 120, 140]) {
        const { win } = simulate({ atk, critchance: 0.2, bonuses: { critDamage: 0.5, healOnHit: 0 } }, { atk: 100 })
        assert.ok(win >= previous, `win fell from ${previous} to ${win} when attack rose to ${atk}`)
        previous = win
    }
})

test('a fight neither side can end gives up instead of hanging', () => {
    // Defence outweighs attack on both sides, so every hit lands for zero and the
    // recursion would never bottom out. The turn ceiling has to catch it.
    const result = simulate({ atk: 10, def: 50 }, { atk: 10, def: 50 })
    assert.ok(Number.isNaN(result.win), 'an unresolvable fight should not report a win chance')
    assert.ok(Number.isNaN(result.loss))
    assert.equal(result.scoreClass, 'minus')
})

test('healing on hit improves the odds it is given', () => {
    const without = simulate({ atk: 90, bonuses: { critDamage: 0, healOnHit: 0 } }, { atk: 105 })
    const with_ = simulate({ atk: 90, bonuses: { critDamage: 0, healOnHit: 0.5 } }, { atk: 105 })
    assert.ok(with_.win > without.win, `healing did not help: ${without.win} -> ${with_.win}`)
})
