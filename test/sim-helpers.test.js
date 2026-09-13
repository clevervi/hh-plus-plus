const test = require('node:test')
const assert = require('node:assert/strict')

const { loadBundle } = require('./support/game-page.js')

const { SimHelpers } = loadBundle().api

// The two counter cycles the game is built on. Each element beats exactly one
// other, and the cycles close, so they double as a check that no link was lost.
const EGO_DAMAGE_CYCLE = ['fire', 'nature', 'stone', 'sun', 'water']
const CRIT_CHANCE_CYCLE = ['darkness', 'light', 'psychic']

const beats = (cycle, element) => cycle[(cycle.indexOf(element) + 1) % cycle.length]

test('elements that do not counter each other grant nothing', () => {
    const bonuses = SimHelpers.calculateDominationBonuses(['fire'], ['light'])
    assert.deepEqual({ ...bonuses.player }, { ego: 0, attack: 0, chance: 0 })
    assert.deepEqual({ ...bonuses.opponent }, { ego: 0, attack: 0, chance: 0 })
})

for (const element of EGO_DAMAGE_CYCLE) {
    const loser = beats(EGO_DAMAGE_CYCLE, element)
    test(`${element} counters ${loser} for ego and attack`, () => {
        const bonuses = SimHelpers.calculateDominationBonuses([element], [loser])
        assert.deepEqual({ ...bonuses.player }, { ego: 0.1, attack: 0.1, chance: 0 })
        assert.deepEqual({ ...bonuses.opponent }, { ego: 0, attack: 0, chance: 0 })
    })
}

for (const element of CRIT_CHANCE_CYCLE) {
    const loser = beats(CRIT_CHANCE_CYCLE, element)
    test(`${element} counters ${loser} for crit chance`, () => {
        const bonuses = SimHelpers.calculateDominationBonuses([element], [loser])
        assert.deepEqual({ ...bonuses.player }, { ego: 0, attack: 0, chance: 0.2 })
    })
}

test('a counter counts once per girl holding the element', () => {
    const bonuses = SimHelpers.calculateDominationBonuses(['fire', 'fire', 'fire'], ['nature'])
    assert.equal(Number(bonuses.player.ego.toFixed(10)), 0.3)
    assert.equal(Number(bonuses.player.attack.toFixed(10)), 0.3)
})

test('both sides can be countering at the same time', () => {
    // fire beats nature, and water beats fire, so each side holds an advantage.
    const bonuses = SimHelpers.calculateDominationBonuses(['fire'], ['nature', 'water'])
    assert.equal(Number(bonuses.player.ego.toFixed(10)), 0.1)
    assert.equal(Number(bonuses.opponent.ego.toFixed(10)), 0.1)
})

test('counting a team fills in the elements it does not hold', () => {
    const counts = SimHelpers.countElementsInTeam(['fire', 'fire', 'water'])
    assert.equal(counts.fire, 2)
    assert.equal(counts.water, 1)
    assert.equal(counts.nature, 0)
    assert.equal(Object.keys({ ...counts }).length, 8)
})

test('a theme needs three girls of an element', () => {
    assert.deepEqual(Array.from(SimHelpers.calculateThemeFromElements(['fire', 'fire', 'water'])), [])
    assert.deepEqual(Array.from(SimHelpers.calculateThemeFromElements(['fire', 'fire', 'fire'])), ['fire'])
})

test('crit chance is shared in proportion to harmony', () => {
    assert.equal(SimHelpers.calculateCritChanceShare(100, 100), 0.15)
    assert.equal(SimHelpers.calculateCritChanceShare(300, 100), 0.225)
    assert.equal(SimHelpers.calculateCritChanceShare(0, 100), 0)
    // 0.3 is the whole pot, so no split can exceed it.
    assert.ok(SimHelpers.calculateCritChanceShare(1e9, 1) < 0.3)
})

test('skill percentages add up into a multiplier', () => {
    const team = { girls: [
        { skills: { 9: { skill: { percentage_value: 10 } } } },
        { skills: { 9: { skill: { percentage_value: 15 } } } },
    ] }
    assert.equal(SimHelpers.getSkillPercentage(team, 9), 1.25)
})

test('a team without the skill multiplies by one', () => {
    const team = { girls: [{ skills: {} }, { skills: { 3: { skill: { percentage_value: 50 } } } }] }
    assert.equal(SimHelpers.getSkillPercentage(team, 9), 1)
})
