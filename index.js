
const fs = require('fs')
const unzip = require('unzipper')
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const fileUpload = require('express-fileupload');
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware/cjs');
const i18nextBackend = require('i18next-fs-backend/cjs');

const api = require('./src/api')
const video = require('./src/video')
const HDHR = require('./src/hdhr')
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
   dizqueTV ${constants.VERSION_NAME}
.------------.
|:::///### o |
|:::///###   |
':::///### o |
'------------'
`);

const NODE = parseInt( process.version.match(/^[^0-9]*(\d+)\..*$/)[1] );

if (NODE < 12) {
    console.error(`WARNING: Your nodejs version ${process.version} is lower than supported. dizqueTV has been tested best on nodejs 12.16.`);
}

let unlockPath = false;
for (let i = 0, l = process.argv.length; i < l; i++) {
    if ((process.argv[i] === "-p" || process.argv[i] === "--port") && i + 1 !== l)
        process.env.PORT = process.argv[i + 1]
    if ((process.argv[i] === "-d" || process.argv[i] === "--database") && i + 1 !== l)
        process.env.DATABASE = process.argv[i + 1]

    if (process.argv[i] === "--unlock") {
        unlockPath = true;
    }
}

const requestedDatabaseDir = process.env.DATABASE;
const runtimeDirs = resolveRuntimeDataDirs({
    databaseDir:
        process.env.AYOITSON_DATABASE ||
        requestedDatabaseDir ||
        path.join(".", ".ayoitson"),
    legacyDir:
        process.env.DIZQUETV_LEGACY_DATABASE ||
        (requestedDatabaseDir ? undefined : path.join(".", ".dizquetv")),
});
process.env.DATABASE = runtimeDirs.databaseDir;
process.env.PORT = process.env.PORT || 8000

if (!fs.existsSync(process.env.DATABASE)) {
    if (fs.existsSync(  path.join(".", ".pseudotv")  )) {
        throw Error(process.env.DATABASE + " folder not found but ./.pseudotv has been found. Please rename this folder or create an empty " + process.env.DATABASE + " folder so that the program is not confused about.");
    }
    fs.mkdirSync(process.env.DATABASE)
}

if(!fs.existsSync(path.join(process.env.DATABASE, 'images'))) {
    fs.mkdirSync(path.join(process.env.DATABASE, 'images'))
}
if(!fs.existsSync(path.join(process.env.DATABASE, 'channels'))) {
    fs.mkdirSync(path.join(process.env.DATABASE, 'channels'))
}
if(!fs.existsSync(path.join(process.env.DATABASE, 'filler'))) {
    fs.mkdirSync(path.join(process.env.DATABASE, 'filler'))
}
if(!fs.existsSync(path.join(process.env.DATABASE, 'custom-shows'))) {
    fs.mkdirSync(path.join(process.env.DATABASE, 'custom-shows'))
}
if(!fs.existsSync(path.join(process.env.DATABASE, 'cache'))) {
    fs.mkdirSync(path.join(process.env.DATABASE, 'cache'))
}
if(!fs.existsSync(path.join(process.env.DATABASE, 'cache','images'))) {
    fs.mkdirSync(path.join(process.env.DATABASE, 'cache','images'))
}


let fontAwesome = "fontawesome-free-5.15.4-web";
let bootstrap = "bootstrap-4.4.1-dist";
let db = createRuntimeDatabase({
    databaseDir: process.env.DATABASE,
    legacyDir: runtimeDirs.legacyDir,
    archiveLegacy: process.env.AYOITSON_ARCHIVE_LEGACY === '1',
});
channelDB = new ChannelDAO( db.sqlite );
initDB(db, channelDB)

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

fileCache = new FileCacheService( path.join(process.env.DATABASE, 'cache') );
cacheImageService = new CacheImageService(db, fileCache);
m3uService = new M3uService(fileCache, channelService)

onDemandService = new OnDemandService(channelService);
programmingService = new ProgrammingService(onDemandService);
activeChannelService = new ActiveChannelService(onDemandService, channelService);

eventService = new EventService();

i18next
    .use(i18nextBackend)
    .use(i18nextMiddleware.LanguageDetector)
    .init({
        // debug: true,
        initImmediate: false,
        backend: {
            loadPath: path.join(__dirname, '/locales/server/{{lng}}.json'),
            addPath: path.join(__dirname, '/locales/server/{{lng}}.json')
        },
        lng: 'en',
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


//setup xmltv update
channelService.on("channel-update", (data) => {
    try {
        console.log("Updating TV Guide due to channel update...");
        //TODO: this could be smarter, like avoid updating 3 times if the channel was saved three times in a short time interval...
        xmltvInterval.updateXML()
        xmltvInterval.restartInterval()
    } catch (err) {
        console.error("Unexpected error issuing TV Guide udpate", err);
    }
} );


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
const apiKeyDb = openAyoitsonDatabase({ databaseDir: process.env.DATABASE })
const requireApiKey = createAuthMiddleware(apiKeyDb)
const authFailureLimiter = createAuthFailureLimiter()

app.use(
    i18nextMiddleware.handle(i18next, {})
);

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
app.use('/images', express.static(path.join(process.env.DATABASE, 'images')))
app.use(express.static(path.join(__dirname, 'web','public')))
app.use('/images', express.static(path.join(process.env.DATABASE, 'images')))
app.use('/cache/images', cacheImageService.routerInterceptor())
app.use('/cache/images', express.static(path.join(process.env.DATABASE, 'cache','images')))
app.use('/favicon.svg', express.static(
    path.join(__dirname, 'resources','favicon.svg')
) );
app.use('/custom.css', express.static(path.join(process.env.DATABASE, 'custom.css')))

// API Routers — gated by X-API-Key (Phase 4). The auth-failure limiter
// runs after the auth middleware so only failed attempts are counted.
app.use('/api', authFailureLimiter)
app.use('/api', requireApiKey)
app.use(api.router(db, channelService, fillerDB, customShowDB, xmltvInterval, guideService, m3uService, eventService, ffmpegSettingsService))
app.use('/api/cache/images', cacheImageService.apiRouters())
app.use('/' + fontAwesome, express.static(path.join(process.env.DATABASE, fontAwesome)))
app.use('/' + bootstrap, express.static(path.join(process.env.DATABASE, bootstrap)))

app.use(video.router( channelService, fillerDB, db, programmingService, activeChannelService, programPlayTimeDB  ))
app.use(hdhr.router)
app.listen(process.env.PORT, () => {
    console.log(`HTTP server running on port: http://*:${process.env.PORT}`)
    let hdhrSettings = db['hdhr-settings'].find()[0]
    if (hdhrSettings.autoDiscovery === true)
        hdhr.ssdp.start()
})

function initDB(db, channelDB) {
    //TODO: this is getting so repetitive, do it better
    if (!fs.existsSync(process.env.DATABASE + '/images/dizquetv.png')) {
        let data = fs.readFileSync(path.resolve(path.join(__dirname, 'resources/dizquetv.png')))
        fs.writeFileSync(process.env.DATABASE + '/images/dizquetv.png', data)
    }
    if (!fs.existsSync(process.env.DATABASE + '/font.ttf')) {
        let data = fs.readFileSync(path.resolve(path.join(__dirname, 'resources/font.ttf')))
        fs.writeFileSync(process.env.DATABASE + '/font.ttf', data)
    }
    if (!fs.existsSync(process.env.DATABASE + '/images/dizquetv.png')) {
        let data = fs.readFileSync(path.resolve(path.join(__dirname, 'resources/dizquetv.png')))
        fs.writeFileSync(process.env.DATABASE + '/images/dizquetv.png', data)
    }
    if (!fs.existsSync(process.env.DATABASE + '/images/generic-error-screen.png')) {
        let data = fs.readFileSync(path.resolve(path.join(__dirname, 'resources/generic-error-screen.png')))
        fs.writeFileSync(process.env.DATABASE + '/images/generic-error-screen.png', data)
    }
    if (!fs.existsSync(process.env.DATABASE + '/images/generic-offline-screen.png')) {
        let data = fs.readFileSync(path.resolve(path.join(__dirname, 'resources/generic-offline-screen.png')))
        fs.writeFileSync(process.env.DATABASE + '/images/generic-offline-screen.png', data)
    }
    if (!fs.existsSync(process.env.DATABASE + '/images/generic-music-screen.png')) {
        let data = fs.readFileSync(path.resolve(path.join(__dirname, 'resources/generic-music-screen.png')))
        fs.writeFileSync(process.env.DATABASE + '/images/generic-music-screen.png', data)
    }
    if (!fs.existsSync(process.env.DATABASE + '/images/loading-screen.png')) {
        let data = fs.readFileSync(path.resolve(path.join(__dirname, 'resources/loading-screen.png')))
        fs.writeFileSync(process.env.DATABASE + '/images/loading-screen.png', data)
    }
    if (!fs.existsSync(process.env.DATABASE + '/images/black.png')) {
        let data = fs.readFileSync(path.resolve(path.join(__dirname, 'resources/black.png')))
        fs.writeFileSync(process.env.DATABASE + '/images/black.png', data)
    }
    if (!fs.existsSync( path.join(process.env.DATABASE, 'custom.css') )) {
        let data = fs.readFileSync(path.resolve(path.join(__dirname, 'resources', 'default-custom.css')))
        fs.writeFileSync( path.join(process.env.DATABASE, 'custom.css'), data)
    }
    if (!fs.existsSync( path.join(process.env.DATABASE, fontAwesome) )) {

        let sourceZip = path.resolve(__dirname, 'resources', fontAwesome) + ".zip";
        let destinationPath = path.resolve(process.env.DATABASE);

        fs.createReadStream(sourceZip)
            .pipe(unzip.Extract({ path: destinationPath }));

    }
    if (!fs.existsSync( path.join(process.env.DATABASE, bootstrap) )) {

        let sourceZip = path.resolve(__dirname, 'resources', bootstrap) + ".zip";
        let destinationPath = path.resolve(process.env.DATABASE);

        fs.createReadStream(sourceZip)
            .pipe(unzip.Extract({ path: destinationPath }));

    }
}


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
