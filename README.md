# hh-plus-plus

## Installation instructions

### Desktop (Chrome, Firefox, Opera, Edge)
a) Install TamperMonkey or Violentmonkey  
b) Click the script URL: https://raw.githubusercontent.com/clevervi/hh-plus-plus/main/dist/hh-plus-plus.user.js  
c) TamperMonkey should automatically prompt you to install/update the script. If it doesn't, open up the TM Dashboard, go to the Utilities tab, scroll down to "Install from URL" and paste the above URL in there.  

### iOS (Safari Only)
a) Install Userscripts from the App Store  
b) Set a location to save scripts  
c) Tap the script URL: https://raw.githubusercontent.com/clevervi/hh-plus-plus/main/dist/hh-plus-plus.user.js  
d) Open up the Userscrips extension from the URL bar and install the script.  

### Android
a) Install a browser that supports userscripts, such as Firefox Nightly Build or Kiwi browser.  
b) Install TamperMonkey for your chosen browser (instructions of how to do so are available online)  
c) Follow the instructions for Desktop above.  

## Architecture

The script ships as a single bundle injected into the game page at `document-body`. `src/index.js` is the entry point: it runs every collector once, then registers the configurable modules with the in-game config panel.

| Path | Responsibility |
| --- | --- |
| `src/collectors/` | Static classes exposing `collect()`. They observe pages and ajax responses and cache game state in `localStorage` under the keys defined in `src/common/Constants.js`. They always run and are not user-configurable. |
| `src/modules/` | User-facing features. Each extends `CoreModule` (group `core`) or `STModule` (group `st`), both built on `HHModule`, and carries a `configSchema`. A module implements `shouldRun()` and `run()`. |
| `src/common/` | Shared plumbing: `Helpers` (DOM, ajax hooks, localStorage), `Constants`, `Sheet` (CSS custom properties), `TooltipManager`, `TableAnnotation`. |
| `src/config/` | The in-game settings panel and persistence of the user's choices. |
| `src/data/` | Static game data (worlds, market, villains, affection tables). |
| `src/i18n/` | Per-locale label files. A missing key falls back to English, then to the key itself. |
| `src/assets/` | SVGs, inlined as base64 data URIs at build time. |
| `build/` | `BannerBuilder` renders the userscript metadata block from `hh-plus-plus.meta.template.js` and the `package.json` version; `ModuleGenerator` scaffolds new modules. |

Styles live beside the module that owns them as `styles.lazy.scss` and are injected only while that module is active (`styles.use()` / `styles.unuse()`), so disabling a module in the config panel also removes its CSS.

The game page supplies jQuery and a number of globals (`GT`, `Hero`, `blessings`, `love_raids`, and others). The script reads them but never declares them, so they are listed in `eslint.config.js` to keep `no-undef` meaningful.

## Development

### Node js
This project is built on Node JS LTS Jod (v22.x LTS) and requires Node 22.13 or newer. On macOS and Linux, you can install Node Version Manager (nvm) and run `nvm i` in the root of this project to install the correct version automatically. On Windows, use [nvm-windows](https://github.com/coreybutler/nvm-windows) or download Node 22 LTS directly from the Node JS website.

### Getting started
This project has minimal dependencies, but there are a few, so run `npm install` in the root of the project to fetch these for the first time.

### Building
There are 2 scripts that get built by this project, a production version and a dev version that includes debug symbols.

To build the dev version only: `npm run build-dev`  
To build the prod version only: `npm run build`  
To build both at once: `npm run build-all`

### Linting and tests
`npm run lint` checks the source with ESLint, configured in `eslint.config.js`. `npm run lint:fix` applies the mechanical fixes. Rules that flag deliberate patterns, such as kept debug helpers, dead stores and loose equality, are warnings, so only real errors fail the run.

`npm test` runs the Node test runner against `test/`. The suite checks the build output rather than internals: both bundles must parse, carry exactly one metadata block at the top of the file with a version matching `package.json`, keep every `@match` from the template, and inline every SVG asset. It also checks that the locale files stay consistent with the English base. Run `npm run build-all` first, since the tests read `dist/`.

### Continuous integration
`.github/workflows/ci.yml` runs lint, build and tests on Node 22 and 24 for every push to `main` and every pull request. It also fails when `dist/` does not match a fresh build, because that directory is what users install from.

### Devloader (Tampermonkey only)
To speed up development, you can use a mini script to load the main script, and therefore skips the need to copy and paste the contents of the script into TamperMonkey each change. With the devloader, it's ready to run as soon as you've done the build. To use it, you'll need to enable filesystem access in the Chrome extension settings for TamperMonkey

```js
// ==UserScript==
// @name         HH++ devloader
// @version      0.1
// @author       You
// @match           https://*.hentaiheroes.com/*
// @match           https://nutaku.haremheroes.com/*
// @match           https://*.gayharem.com/*
// @match           https://*.comixharem.com/*
// @match           https://*.hornyheroes.com/*
// @match           https://*.pornstarharem.com/*
// @run-at          document-body
// @grant        none
// @require file:///path/to/hh-plus-plus/dist/hh-plus-plus.dev.user.js
// ==/UserScript==
```

### Generating new modules
There are 2 helper scripts in this project to generate boilerplate code.

#### Core
`npm run generate-module core Example example` will generate a new module directory `ExampleModule` with an empty `styles.lazy.scss` and a pre-populated `index.js`:

```js
import CoreModule from '../CoreModule'
import Helpers from '../../common/Helpers'
import I18n from '../../i18n'

import styles from './styles.lazy.scss'

const MODULE_KEY = 'example'

class ExampleModule extends CoreModule {
    constructor () {
        super({
            baseKey: MODULE_KEY,
            label: I18n.getModuleLabel('config', MODULE_KEY),
            default: true
        })
        this.label = I18n.getModuleLabel.bind(this, MODULE_KEY)
    }

    shouldRun () {
        return // TODO
    }

    run () {
        if (this.hasRun || !this.shouldRun()) {return}

        styles.use()

        Helpers.defer(() => {
            // TODO
        })

        this.hasRun = true
    }
}

export default ExampleModule
```

#### Style Tweaks
`npm run generate-module st Example example` will generate a new module directory `ExampleStyleTweak` with an empty `styles.lazy.scss` and a pre-populated `index.js`:

```js
import STModule from '../STModule'
import Helpers from '../../common/Helpers'
import I18n from '../../i18n'

import styles from './styles.lazy.scss'

const MODULE_KEY = 'example'

class ExampleStyleTweak extends STModule {
    constructor () {
        const configSchema = ({
            baseKey: MODULE_KEY,
            label: I18n.getModuleLabel('stConfig', MODULE_KEY),
            default: true
        })
        super({
            configSchema,
            styles
        })
    }

    shouldRun () {
        return // TODO
    }
}

export default ExampleStyleTweak
```
In most cases, a Style Tweak is purely SCSS, so the only thing to fill in in `index.js` is the `shouldRun` to indicate whether it should run on the current page.

### Publishing a new version
This project uses semantic versioning in the form of `major.minor.patch`, where a `major` change is one which affects the entire script, a `minor` change is a new module, and a `patch` is a change to an existing module. When publishing a new version, bump the version number in `package.json`, run `npm install` and `npm run build-all` to fully propagate the version number, then note down the version number with a summary of the changes in `CHANGELOG` before committing all files to the repository. Run `npm run lint` and `npm test` first; CI runs both, and also checks that the committed `dist/` matches a fresh build.
