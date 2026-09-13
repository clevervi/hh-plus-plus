import Helpers from '../../common/Helpers'

/**
 * ELEMENTS ASSUMPTIONS
 *
 * 1) Girl and Harem synergy bonuses for Attack, Defense, Ego and Harmony are already included in the shown stats for league and seasons
 * 2) Girl and Harem synergy bonuses for Crit damage, Heal-on-hit, and Crit chance are not shown at all for league and seasons for opponents and must be built from team and an estimate of harem
 * 3) Countering bonuses for ego and attack are included in the shown stats, but crit chance bonus is not
 *
 * ELEMENTS FACTS
 *
 * 1) Crit damage and chance bonuses are additive; Ego and damage bonuses are multiplicative
 * 2) Opponent harem synergies are completely unavailable to the player for seasons, they are available in league
 */
const ELEMENTS = {
    chance: {
        darkness: 'light',
        light: 'psychic',
        psychic: 'darkness'
    },
    egoDamage: {
        fire: 'nature',
        nature: 'stone',
        stone: 'sun',
        sun: 'water',
        water: 'fire'
    }
}


class SimHelpers {
    static calculateDominationBonuses(playerElements, opponentElements) {
        const bonuses = {
            player: {
                ego: 0,
                attack: 0,
                chance: 0
            },
            opponent: {
                ego: 0,
                attack: 0,
                chance: 0
            }
        };

        [
            {a: playerElements, b: opponentElements, k: 'player'},
            {a: opponentElements, b: playerElements, k: 'opponent'}
        ].forEach(({a,b,k})=>{
            a.forEach(element => {
                if (ELEMENTS.egoDamage[element] && b.includes(ELEMENTS.egoDamage[element])) {
                    bonuses[k].ego += 0.1
                    bonuses[k].attack += 0.1
                }
                if (ELEMENTS.chance[element] && b.includes(ELEMENTS.chance[element])) {
                    bonuses[k].chance += 0.2
                }
            })
        })

        return bonuses
    }

    static countElementsInTeam(elements) {
        const counts = {
            fire: 0,
            stone: 0,
            sun: 0,
            water: 0,
            nature: 0,
            darkness: 0,
            light: 0,
            psychic: 0
        }

        elements.forEach(element => {
            // The element comes straight off girls[n].element_data.type. If the
            // game adds a ninth one, counting it blindly would store NaN and
            // every number downstream would be NaN without anything failing.
            if (!Object.prototype.hasOwnProperty.call(counts, element)) {
                throw new Error(`Unknown girl element "${element}" from the game; refusing to score a team the simulator does not recognise`)
            }
            counts[element] += 1
        })

        return counts
    }

    static findBonusFromSynergies(synergies, element, teamGirlSynergyBonusesMissing, counts) {
        const {bonus_multiplier, team_bonus_per_girl} = synergies.find(({element: {type}})=>type===element)

        return bonus_multiplier + (teamGirlSynergyBonusesMissing ? counts[element]*team_bonus_per_girl : 0)
    }

    static async calculateSynergiesFromTeamMemberElements(elements, ignorePassives) {
        const counts = SimHelpers.countElementsInTeam(elements)

        // Only care about those not included in the stats already: fire, stone and water
        // Assume max harem synergy
        const girlDictionary = await Helpers.getGirlDictionary()
        const girlCount = girlDictionary.size || 800
        const girlsPerElement = Math.min(girlCount / 8, 100)

        return {
            critDamage: (ignorePassives ? 0 : (0.0035 * girlsPerElement)) + (0.1  * counts.fire),
            critChance: (ignorePassives ? 0 : (0.0007 * girlsPerElement)) + (0.02 * counts.stone),
            healOnHit:  (ignorePassives ? 0 : (0.001  * girlsPerElement)) + (0.03 * counts.water)
        }
    }

    static calculateThemeFromElements(elements) {
        const counts = SimHelpers.countElementsInTeam(elements)

        const theme = []
        Object.entries(counts).forEach(([element, count]) => {
            if (count >= 3) {
                theme.push(element)
            }
        })
        return theme
    }

    static calculateCritChanceShare(ownHarmony, otherHarmony) {
        // Harmony is read from the game (caracs_per_opponent[id].chance). A
        // renamed field makes this undefined, and 0.3*undefined/NaN is NaN,
        // which loses every comparison in Simulator.run() and would be shown
        // as a "close" fight with a NaN chance. Report it instead of guessing.
        const total = ownHarmony + otherHarmony
        if (!Number.isFinite(ownHarmony) || !Number.isFinite(otherHarmony) || total <= 0) {
            throw new Error(`Harmony from the game is unusable (own: ${ownHarmony}, other: ${otherHarmony}); refusing to report a made-up crit chance`)
        }

        return 0.3*ownHarmony/total
    }

    static getSkillPercentage(team, id) {
        // A team with no girls at all is not a team, so that is worth reporting.
        if (!team || !Array.isArray(team.girls)) {
            throw new Error(`Team read from the game has no girls array; cannot total skill ${id}`)
        }

        // Individual girls are a different matter: a slot can be empty and a girl
        // can arrive without her skills, which the element handling above already
        // allows for. Either way she adds nothing to this skill, which is what
        // the ?? 0 always meant. The old chain only guarded skills[id], so a girl
        // with no skills object at all threw and took the whole simulation down.
        const total = team.girls
            .map(girl => girl?.skills?.[id]?.skill?.percentage_value ?? 0)
            .reduce((a, b) => a + b, 0)

        return 1 + (total / 100)
    }
}

export default SimHelpers
window.HHPlusPlus.SimHelpers = SimHelpers
