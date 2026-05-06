
const fs = require('fs')
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const fileUpload = require('express-fileupload');
const i18next = require('i18next');
const i18nextBackend = require('i18next-fs-backend/cjs');

// Phase 4 (Lane Alpha): legacy `src/api.js` monolith was split into per-
// resource routers under `src/api/*` and composed by `src/api/index.js`.
// `compose(deps, { requireApiKey })` returns a single mountable router with
// auth applied per-router (everything except GET /api/health).
const apiCompose = require('./src/api');
const video = require('./src/video')
const HDHR = require('./src/hdhr')
const { seedRuntimeAssets } = require('./src/lib/init-assets')
const {
  loadAllowedLocales,
  buildBackendPaths,
  safeLng,
} = require('./src/lib/i18n-locales')
const { debounce } = require('./src/lib/debounce')
const { openAyoitsonDatabase } = require('./src/storage/sqlite')
const { createAuthMiddleware } = require('./src/middleware/auth')
const {
    createAuthFailureLimiter,
    createStreamLimiter,
} = require('./src/middleware/rate-limit')
const { createCorsMiddleware } = require('./src/middleware/cors')
const { createHelmetMiddleware } = require('./src/middleware/helmet')
const FileCacheService = require('./src/services/file-cache-service');
const CacheImageService = require('./src/services/cache-image-service');
const ChannelService = require("./src/services/channel-service");

const xmltv = require('./src/xmltv')
const Plex = require('./src/plex');
const constants = require('./src/constants')
const ChannelDAO = require("./src/dao/channel-dao");
const M3uService = require("./src/services/m3u-service");
const FillerDAO = require("./src/dao/filler-dao");
const CustomShowDAO = require("./src/dao/custom-show-dao");
const TVGuideService = require("./src/services/tv-guide-service");
const EventService = require("./src/services/event-service");
const OnDemandService = require("./src/services/on-demand-service");
const ProgrammingService = require("./src/services/programming-service");
const ActiveChannelService = require('./src/services/active-channel-service')
const PlayTimeDAO = require('./src/dao/play-time-dao')
const FfmpegSettingsService = require('./src/services/ffmpeg-settings-service')
const {
    createRuntimeDatabase,
    resolveRuntimeDataDirs,
} = require('./src/storage/sqlite-runtime')

const onShutdown = require("node-graceful-shutdown").onShutdown;

console.log(
`         \\
   ${constants.APP_NAME} ${constants.VERSION_NAME}
.------------.
|:::///### o |
|:::///###   |
':::///### o |
'------------'
`);

const NODE = parseInt( process.version.match(/^[^0-9]*(\d+)\..*$/)[1] );

if (NODE < 12) {
    console.error(`WARNING: Your nodejs version ${process.version} is lower than supported. ${constants.APP_NAME} has been tested best on nodejs 12.16.`);
}

let unlockPath = false;
let cliDatabaseDir;
for (let i = 0, l = process.argv.length; i < l; i++) {
    if ((process.argv[i] === "-p" || process.argv[i] === "--port") && i + 1 !== l)
        process.env.PORT = process.argv[i + 1]
    if ((process.argv[i] === "-d" || process.argv[i] === "--database") && i + 1 !== l)
        cliDatabaseDir = process.argv[i + 1]

    if (process.argv[i] === "--unlock") {
        unlockPath = true;
    }
}

const deprecatedDatabaseDir = process.env.DATABASE;
if (deprecatedDatabaseDir && !process.env.AYOITSON_DATABASE && !cliDatabaseDir) {
    console.warn('WARNING: DATABASE is deprecated; use AYOITSON_DATABASE. DATABASE will be removed after one compatibility release.');
}
const runtimeDirs = resolveRuntimeDataDirs({
    databaseDir:
        cliDatabaseDir ||
        process.env.AYOITSON_DATABASE ||
        deprecatedDatabaseDir ||
        path.join(".", ".ayoitson"),
    legacyDir:
        process.env.AYOITSON_LEGACY_DATABASE ||
        (cliDatabaseDir || deprecatedDatabaseDir ? undefined : path.join(".", ".dizquetv")),
});
process.env.AYOITSON_DATABASE = runtimeDirs.databaseDir;
process.env.DATABASE = runtimeDirs.databaseDir;
process.env.PORT = process.env.PORT || 8000
const databaseDir = process.env.AYOITSON_DATABASE;

if (!fs.existsSync(databaseDir)) {
    fs.mkdirSync(databaseDir)
}

let fontAwesome = "fontawesome-free-5.15.4-web";
let bootstrap = "bootstrap-4.4.1-dist";
const reactDistDir = path.join(__dirname, 'web', 'dist');
let db = createRuntimeDatabase({
    databaseDir,
    legacyDir: runtimeDirs.legacyDir,
    archiveLegacy: process.env.AYOITSON_ARCHIVE_LEGACY === '1',
});
channelDB = new ChannelDAO( db.sqlite );

// First-boot asset seeding. The legacy initDB() function repeated the same
// "if (!exists) read+write" pattern 8 times — closes BUG-TODO-REPETITIVE at
// the original index.js:308 site.
seedRuntimeAssets({
    databaseDir,
    resourcesDir: path.join(__dirname, 'resources'),
    bundles: [fontAwesome, bootstrap],
});

channelService = new ChannelService(channelDB);

fillerDB = new FillerDAO( db.sqlite, channelService );
customShowDB = new CustomShowDAO( db.sqlite );
let programPlayTimeDB = new PlayTimeDAO( db.sqlite );
let ffmpegSettingsService = new FfmpegSettingsService(db, unlockPath);

async function initializeProgramPlayTimeDB() {
    try {
        let t0 = new Date().getTime();
        await programPlayTimeDB.load();
        let t1 = new Date().getTime();
        console.log(`Program Play Time Cache loaded in ${t1-t0} milliseconds.`);
    } catch (err) {
        console.log(err);
    }
}
initializeProgramPlayTimeDB();

fileCache = new FileCacheService( path.join(databaseDir, 'cache') );
cacheImageService = new CacheImageService(db, fileCache);
m3uService = new M3uService(fileCache, channelService)

onDemandService = new OnDemandService(channelService);
programmingService = new ProgrammingService(onDemandService);
activeChannelService = new ActiveChannelService(onDemandService, channelService);

eventService = new EventService();

// i18next path-injection hardening (closes BUG-I18NEXT). The {{lng}}
// interpolation in i18next-fs-backend's loadPath is the attack surface: if
// the language is operator-controlled, an attacker can request
// `../../etc/passwd` style values and force i18next-fs-backend to read
// arbitrary JSON files. The React cutover removes request-time language
// detection; backend translations load from the startup allowlist only.
const i18nPaths = buildBackendPaths(__dirname);
const allowedLocales = loadAllowedLocales(i18nPaths.localesDir);

i18next
    .use(i18nextBackend)
    .init({
        // debug: true,
        initImmediate: false,
        backend: {
            loadPath: i18nPaths.loadPath,
            addPath: i18nPaths.addPath,
        },
        lng: safeLng(allowedLocales, 'en', 'en'),
        fallbackLng: 'en',
        preload: ['en'],
    });


const guideService = new TVGuideService(xmltv, db, cacheImageService, null, i18next);


let xmltvInterval = {
    interval: null,
    lastRefresh: null,
    updateXML: async () => {

        let channels = [];

        try {
            channels = await channelService.getAllChannels();
            let xmltvSettings = db['xmltv-settings'].find()[0];
            let t = guideService.prepareRefresh(channels, xmltvSettings.cache*60*60*1000);
            channels = null;

            guideService.refresh(t);
        } catch (err) {
            console.error("Unable to update TV guide?", err);
            return;
        }
    },

    notifyPlex: async() => {
        xmltvInterval.lastRefresh = new Date()
        console.log('XMLTV Updated at ', xmltvInterval.lastRefresh.toLocaleString());

        channels = await channelService.getAllChannels();

        let plexServers = db['plex-servers'].find()
        for (let i = 0, l = plexServers.length; i < l; i++) {       // Foreach plex server
            let plex = new Plex(plexServers[i])
            let dvrs;
            if ( !plexServers[i].arGuide && !plexServers[i].arChannels) {
                continue;
            }
            try {
                dvrs = await plex.GetDVRS() // Refresh guide and channel mappings
            } catch(err) {
                console.error(`Couldn't get DVRS list from ${plexServers[i].name}. This error will prevent 'refresh guide' or 'refresh channels' from working for this Plex server. But it is NOT related to playback issues.` , err );
                continue;
            }
            if (plexServers[i].arGuide) {
                try {
                    await plex.RefreshGuide(dvrs);
                } catch(err) {
                    console.error(`Couldn't tell Plex ${plexServers[i].name} to refresh guide for some reason. This error will prevent 'refresh guide' from working for this Plex server. But it is NOT related to playback issues.` , err);
                }
            }
            if (plexServers[i].arChannels && channels.length !== 0) {
                try {
                    await plex.RefreshChannels(channels, dvrs);
                } catch(err) {
                    console.error(`Couldn't tell Plex ${plexServers[i].name} to refresh channels for some reason. This error will prevent 'refresh channels' from working for this Plex server. But it is NOT related to playback issues.` , err);
                }
            }
        }
    },

    startInterval: () => {
        let xmltvSettings = db['xmltv-settings'].find()[0]
        if (xmltvSettings.refresh !== 0) {
            xmltvInterval.interval = setInterval( async () => {
                try {
                    await xmltvInterval.updateXML()
                } catch(err) {
                    console.error("update XMLTV error", err);
                }
            }, xmltvSettings.refresh * 60 * 60 * 1000)
        }
    },
    restartInterval: () => {
        if (xmltvInterval.interval !== null)
            clearInterval(xmltvInterval.interval)
        xmltvInterval.startInterval()
    }
}

guideService.on("xmltv-updated", (data) => {
    try {
        xmltvInterval.notifyPlex();
    } catch (err) {
        console.error("Unexpected issue when reacting to xmltv update", err);
    }
} );

xmltvInterval.updateXML()
xmltvInterval.startInterval()


// Debounce the channel-update -> updateXML() chain. Editing 50 channels in
// quick succession used to fire 50 regenerations; the new trailing-edge
// debounce coalesces them into one regeneration ~750ms after the last save.
// Closes BUG-TODO-DEBOUNCE.
const debouncedGuideRefresh = debounce(() => {
    try {
        console.log("Updating TV Guide due to channel update...");
        xmltvInterval.updateXML()
        xmltvInterval.restartInterval()
    } catch (err) {
        console.error("Unexpected error issuing TV Guide update", err);
    }
}, 750);

channelService.on("channel-update", () => {
    debouncedGuideRefresh();
});


let hdhr = HDHR(db, channelDB)
let app = express()

// trust proxy: only honor X-Forwarded-* from loopback / link-local /
// unique-local sources. Closes F9-trustproxy and the HDHR descriptor
// host-header reflection (src/hdhr.js).
app.set('trust proxy', 'loopback,linklocal,uniquelocal')

eventService.setup(app);

// --- Phase 4 security baseline (Lane Epsilon) ---
// CORS deny-by-default runs first so cross-origin preflights never reach
// further middleware. helmet sets CSP / HSTS / X-Frame-Options /
// X-Content-Type-Options / Referrer-Policy on every response. The streaming
// limiter is mounted on /video, /m3u, and the HDHR endpoints; the
// auth-failure limiter is mounted in front of /api/* so brute-force probes
// against api_keys cost the attacker.
app.use(createCorsMiddleware())
app.use(createHelmetMiddleware())
app.use(createStreamLimiter())

// API key store reuses the runtime SQLite database so api_keys live in
// the same file as the rest of the operator's data.
const apiKeyDb = openAyoitsonDatabase({ databaseDir })
const requireApiKey = createAuthMiddleware(apiKeyDb)
const authFailureLimiter = createAuthFailureLimiter()

app.use(fileUpload({
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
    },
    abortOnLimit: true,
    safeFileNames: true,
    preserveExtension: true,
}));
app.use(bodyParser.json({limit: '1mb'}))

app.get('/version.js', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'application/javascript'
    });

    res.write( `
        function setUIVersionNow() {
            setTimeout( setUIVersionNow, 1000);
            var element = document.getElementById("uiversion");
            if (element != null) {
                element.innerHTML = "${constants.VERSION_NAME}";
            }
        }
        setTimeout( setUIVersionNow, 1000);
    ` );
    res.end();
});
app.use('/images', express.static(path.join(databaseDir, 'images')))
app.use('/images', express.static(path.join(databaseDir, 'images')))
app.use('/cache/images', cacheImageService.routerInterceptor())
app.use('/cache/images', express.static(path.join(databaseDir, 'cache','images')))
app.use('/favicon.svg', express.static(
    path.join(__dirname, 'resources','favicon.svg')
) );
app.use('/custom.css', express.static(path.join(databaseDir, 'custom.css')))

// API Routers — Phase 4 redesign (Lane Alpha). Per-resource routers under
// `src/api/*` are composed by `src/api/index.js`; auth is mounted *per-router*
// so `GET /api/health` stays public for liveness probes while everything
// else (including `GET /api/plex-servers`) requires X-API-Key.
//
// The auth-failure rate limiter still runs at the /api seam so brute-force
// probes against the api_keys store cost the attacker — `skipSuccessfulRequests`
// in the limiter ensures only failed responses are counted.
app.use('/api', authFailureLimiter)
app.use(
    apiCompose.compose(
        {
            db,
            channelService,
            fillerDB,
            customShowDB,
            xmltvInterval,
            guideService,
            m3uService,
            eventService,
            ffmpegSettingsService,
            apiKeyDb,
        },
        { requireApiKey }
    )
)
app.use('/api/cache/images', cacheImageService.apiRouters())
app.use('/' + fontAwesome, express.static(path.join(databaseDir, fontAwesome)))
app.use('/' + bootstrap, express.static(path.join(databaseDir, bootstrap)))

app.use(video.router( channelService, fillerDB, db, programmingService, activeChannelService, programPlayTimeDB  ))
app.use(hdhr.router)

function isReactSpaPath(reqPath) {
    if (path.extname(reqPath)) {
        return false;
    }

    const reservedPaths = [
        '/api',
        '/images',
        '/cache/images',
        '/video',
        '/radio',
        '/stream',
        '/m3u8',
        '/playlist',
        '/media-player',
        '/setup',
        '/device.xml',
        '/discover.json',
        '/lineup.json',
        '/lineup_status.json',
        '/custom.css',
        '/favicon.svg',
        '/version.js',
        `/${fontAwesome}`,
        `/${bootstrap}`,
    ];

    return reservedPaths.every((reserved) => (
        reqPath !== reserved && !reqPath.startsWith(`${reserved}/`)
    ));
}

function sendReactSpaIndex(res, next) {
    fs.readFile(path.join(reactDistDir, 'index.html'), 'utf8', (err, html) => {
        if (err) {
            next(err);
            return;
        }
        res
            .type('html')
            .send(html.replace(/__AYOITSON_CSP_NONCE__/g, res.locals.cspNonce || ''));
    });
}

app.use(express.static(reactDistDir, { index: false }))
app.get('*', (req, res, next) => {
    if (req.method !== 'GET' || !isReactSpaPath(req.path)) {
        next();
        return;
    }
    sendReactSpaIndex(res, next);
})

app.listen(process.env.PORT, () => {
    console.log(`HTTP server running on port: http://*:${process.env.PORT}`)
    let hdhrSettings = db['hdhr-settings'].find()[0]
    if (hdhrSettings.autoDiscovery === true)
        hdhr.ssdp.start()
})

// initDB() asset-seeding logic moved to `src/lib/init-assets.js`
// (seedRuntimeAssets). Closes BUG-TODO-REPETITIVE.


function _wait(t) {
    return new Promise((resolve) => {
      setTimeout(resolve, t);
    });
}


async function sendEventAfterTime() {
    let t = (new Date()).getTime();
    await _wait(20000);
    eventService.push(
        "lifecycle",
        {
            "message": i18next.t("event.server_started"),
            "detail" : {
                "time": t,
            },
            "level" : "success"
        }
    );
    
}
sendEventAfterTime();




onShutdown("log" , [],  async() => {
    let t = (new Date()).getTime();
    eventService.push(
        "lifecycle",
        {
            "message": i18next.t("event.server_shutdown"),
            "detail" : {
                "time": t,
            },
            "level" : "warning"
        }
    );

    console.log("Received exit signal, attempting graceful shutdonw...");
    await _wait(2000);
});
onShutdown("xmltv-writer" , [],  async() => {
    await xmltv.shutdown();
} );
onShutdown("sqlite", [], async() => {
    db.close();
} );
onShutdown("active-channels", [], async() => {
    await activeChannelService.shutdown();
} );

onShutdown("video", [], async() => {
    await video.shutdown();
} );
