import {
    BlessingsCollector,
    BoosterStatusCollector,
    ClubStatusCollector,
    EventVillainsCollector,
    GirlDictionaryCollector,
    HaremFilterCollector,
    LabyrinthInfoCollector,
    LeagueInfoCollector,
    MarketInfoCollector,
    PathEventCollector,
    QuestStatusCollector,
    SeasonStatsCollector,
    SidequestStatusCollector,
    TeamsCollector,
    TimerCollector
} from './collectors'
import Helpers from './common/Helpers'
import TableAnnotation from './common/TableAnnotation'
import Guard from './common/Guard'
import Preflight from './common/Preflight'
import Config from './config'
import * as modules from './modules'
import LeaderboardSupportersIndicatorsModule from './modules/LeaderboardSupportersIndicatorsModule'

const runScript = () => {
    // Runs first so a game-side change is reported once, up front, instead of
    // surfacing as an unreadable TypeError from whichever module hits it.
    Guard.run('Preflight', () => Preflight.check())

    const config = new Config()

    // base modules. The keys double as the label reported when one throws,
    // so they survive minification while the class names themselves do not.
    const collectors = {
        GirlDictionaryCollector,
        BlessingsCollector,
        HaremFilterCollector,
        TeamsCollector,
        EventVillainsCollector,
        SeasonStatsCollector,
        MarketInfoCollector,
        LabyrinthInfoCollector,
        LeagueInfoCollector,
        TimerCollector,
        BoosterStatusCollector,
        ClubStatusCollector,
        QuestStatusCollector,
        SidequestStatusCollector,
        PathEventCollector,
    }
    Object.entries(collectors).forEach(([name, collector]) => Guard.run(name, () => collector.collect()))

    Guard.run('TableAnnotation', () => TableAnnotation.run())

    Guard.run('LeaderboardSupportersIndicatorsModule', () => new LeaderboardSupportersIndicatorsModule().run())

    // configurable modules

    // core
    config.registerGroup({
        key: 'core',
        name: `${Helpers.getGameKey()}++ Core`
    })

    // style tweaks
    config.registerGroup({
        key: 'st',
        name: 'Style Tweaks',
        iconEl: '<div></div>'
    })

    Object.entries(modules).forEach(([name, Module]) => {
        Guard.run(name, () => config.registerModule(new Module()))
    })

    Guard.run('loadConfig', () => config.loadConfig())

    config.runModules()

    Helpers.runDeferred()

    // expose config for other scripts to register their own modules
    window.hhPlusPlusConfig = {
        registerGroup: config.registerGroup.bind(config),
        registerModule: config.registerModule.bind(config),
        runModules: config.runModules.bind(config),
        loadConfig: config.loadConfig.bind(config),
    }
    $(document).trigger('hh++-bdsm:loaded')
}

if (!window.$) {
    console.log('HH++ WARNING: No jQuery found. Probably an error page. Ending the script here')
} else if (location.pathname === '/' && (location.hostname.includes('www') || location.hostname.includes('test'))) {
    // iframe container, do nothing.
} else if (['/integrations/', '/index.php'].some(path => path === location.pathname) && location.hostname.includes('nutaku')) {
    // nutaku post-login home screen, redirect.
    $(document).ready(() => {
        const {navigate} = window.shared ? window.shared.general : window
        navigate('/home.html')
    })
} else if (document.getElementById('loading-overlay')) {
    // loading page, do nothing.
} else {
    runScript()
}
