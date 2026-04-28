"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoUpdater = exports.channelName = void 0;
const events_1 = __importDefault(require("events"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("node:stream/promises");
const electron_1 = require("electron");
const electron_is_dev_1 = __importDefault(require("electron-is-dev"));
const semver_1 = require("semver");
const request_1 = require("@octokit/request");
// Platform validation
const supportedPlatforms = ['darwin', 'win32', 'linux'];
function assertPlatform(platform) {
    if (!supportedPlatforms.includes(platform)) {
        throw new TypeError(`${platform} is not a supported platform`);
    }
}
const platform = os_1.default.platform();
if (platform === 'linux') {
    console.warn('WARNING: Linux is only enabled in electron-github-autoupdater for development purposes, updating does not work on linux');
}
assertPlatform(platform);
if (!supportedPlatforms.includes(platform))
    throw new Error(`Platform: ${platform} is not currently supported by electron-github-autoupdater`);
exports.channelName = 'ElectronAutoUpdater';
// Default event types from electron's autoUpdater
const electronAutoUpdaterEventTypes = [
    'error',
    'checking-for-update',
    'update-available',
    'update-not-available',
    'update-downloaded',
    'before-quit-for-update',
];
// Custom event types for this library
const eventTypes = [...electronAutoUpdaterEventTypes, 'update-downloading'];
class ElectronGithubAutoUpdater extends events_1.default {
    baseUrl;
    owner;
    repo;
    accessToken;
    allowPrerelease;
    shouldForwardEvents;
    currentVersion;
    appName;
    cacheFilePath;
    downloadsDirectory;
    eventTypes;
    lastEmit;
    platform;
    platformConfig;
    _headers;
    _request;
    latestRelease;
    constructor({ baseUrl = 'https://api.github.com', owner, repo, accessToken, allowPrerelease = false, shouldForwardEvents = true, cacheFilePath = path_1.default.join(electron_1.app.getPath('temp'), electron_1.app.getName(), 'updates', '.cache'), downloadsDirectory = path_1.default.join(electron_1.app.getPath('temp'), electron_1.app.getName(), 'updates', 'downloads'), }) {
        super();
        this.baseUrl = baseUrl;
        this.owner = owner;
        this.repo = repo;
        this.accessToken = accessToken;
        this.allowPrerelease = allowPrerelease;
        this.shouldForwardEvents = shouldForwardEvents;
        this.currentVersion = electron_1.app.getVersion();
        this.appName = electron_1.app.getName();
        this.cacheFilePath = cacheFilePath;
        this.downloadsDirectory = downloadsDirectory;
        this.eventTypes = eventTypes;
        this.lastEmit = { type: 'update-not-available', args: [] };
        this.latestRelease = null;
        // Github request headers
        this._headers = {
            authorization: `Bearer ${this.accessToken}`,
        };
        this._request = request_1.request.defaults({
            baseUrl: this.baseUrl,
            headers: this._headers,
        });
        // TS validate platform
        assertPlatform(platform);
        this.platform = platform;
        this.platformConfig = this._getPlatformConfig();
        // Initialize the app
        this._initCache();
        this._registerInterceptors();
        // Register IPC handlers and listeners
        if (this.shouldForwardEvents)
            this._registerIpcMethods();
    }
    /**************************************************************************************************
     * Add listeners and handlers for IPC
     **************************************************************************************************/
    // Adds listeners for IPC Events
    _registerIpcMethods = () => {
        if (this.shouldForwardEvents) {
            electron_1.ipcMain.on(exports.channelName, (event, method, args) => {
                switch (method) {
                    case 'getStatus':
                        event.returnValue = { eventName: this.lastEmit.type, eventDetails: this.lastEmit.args };
                        break;
                    case 'getVersion':
                        event.returnValue = this.currentVersion;
                        break;
                    default:
                        throw new Error(`No listener for ${method}`);
                }
            });
            electron_1.ipcMain.handle(exports.channelName, async (event, method, args) => {
                switch (method) {
                    case 'checkForUpdates':
                        return this.checkForUpdates();
                    case 'quitAndInstall':
                        this.quitAndInstall();
                        return true;
                    case 'clearCache':
                        this.clearCache();
                        return true;
                    case 'getLatestRelease':
                        return await this.getLatestRelease();
                    default:
                        throw new Error(`No listener for ${method}`);
                }
            });
        }
    };
    /**************************************************************************************************
     *     Internal Methods
     **************************************************************************************************/
    _emitError(error) {
        this.emit('error', error);
        console.error(error);
    }
    _initCache = () => {
        // Create temp dir if not exists
        if (!fs_1.default.existsSync(this.downloadsDirectory))
            fs_1.default.mkdirSync(this.downloadsDirectory, { recursive: true });
    };
    // Intercept electron's autoUpdater events and forward to renderer
    _registerInterceptors = () => {
        electron_1.autoUpdater.on('before-quit-for-update', () => this.emit('before-quit-for-update'));
        electron_1.autoUpdater.on('update-available', () => {
            this.emit('update-downloaded', {
                releaseName: this.latestRelease?.name,
                releaseNotes: this.latestRelease?.body,
                releaseDate: this.latestRelease && new Date(this.latestRelease?.published_at),
                updateUrl: this.latestRelease?.html_url,
                prerelease: this.latestRelease?.prerelease,
            });
        });
        electron_1.autoUpdater.on('error', (error) => this._emitError(error));
        electron_1.autoUpdater.on('update-not-available', () => this.emit('update-not-available'));
    };
    // Gets the config for the current platform: files to download, the "feedURL" for electron's autoUpdater
    _getPlatformConfig = () => {
        return {
            win32: {
                requiredFiles: [/[^ ]*-full\.nupkg/gim, /RELEASES/],
                feedUrl: this.downloadsDirectory,
            },
            linux: {
                requiredFiles: [/[^ ]*-full\.nupkg/gim, /RELEASES/],
                feedUrl: this.downloadsDirectory,
            },
            darwin: {
                requiredFiles: [/[^ ]*\.zip/gim, /feed.json/],
                feedUrl: path_1.default.join(this.downloadsDirectory, 'feed.json'),
            },
        }[this.platform];
    };
    _getCachedReleaseId = () => {
        if (fs_1.default.existsSync(this.cacheFilePath)) {
            return parseInt(fs_1.default.readFileSync(this.cacheFilePath, { encoding: 'utf-8' }));
        }
        else {
            return null;
        }
    };
    /**
     * Gets all releases from github sorted by version number (most recent first)
     */
    async getReleases() {
        const request = await this._request;
        const releasesResponse = await request('GET /repos/{owner}/{repo}/releases', {
            owner: this.owner,
            repo: this.repo,
            per_page: 100,
        });
        const validateAssets = (release) => {
            try {
                this._getAssets(release);
                return true;
            }
            catch (error) {
                return false;
            }
        };
        const releases = releasesResponse.data.filter((release) => !release.draft && (this.allowPrerelease || !release.prerelease) && validateAssets(release));
        releases.sort((a, b) => (0, semver_1.rcompare)(a.name, b.name));
        return releases;
    }
    // Gets the latest release from github
    getLatestRelease = async () => {
        // If already checking, log an error
        if (this.lastEmit.type === 'checking-for-update') {
            throw new Error('Already checking for updates, cannot check again.');
        }
        // First emit that we are checking
        this.emit('checking-for-update');
        const releases = await this.getReleases();
        if (releases.length === 0) {
            throw new Error('No releases found');
        }
        this.latestRelease = releases[0];
        return releases[0];
    };
    // Preps the default electron autoUpdater to install the update
    _loadElectronAutoUpdater = () => {
        if (!electron_is_dev_1.default) {
            electron_1.autoUpdater.setFeedURL({ url: this.platformConfig.feedUrl });
        }
    };
    // Uses electron autoUpdater to install the downloaded update
    _installDownloadedUpdate = () => {
        if (!electron_is_dev_1.default) {
            try {
                electron_1.autoUpdater.checkForUpdates();
            }
            catch (e) {
                this._emitError(e);
            }
        }
        else {
            console.error('Cannot install an update while running in dev mode.');
            // Fake an install for testing purposes
            electron_1.autoUpdater.emit('update-available');
        }
    };
    // Emit event, also optionally forward to renderer windows
    emit = (e, args) => {
        // Store the last emit, so we can send to renderer listeners who were added in the middle of the process
        // rather than re-performing the work
        this.lastEmit = { type: e, args: args };
        // Emit over IPC also
        if (this.shouldForwardEvents) {
            electron_1.BrowserWindow.getAllWindows().map((window) => {
                window.webContents.send(exports.channelName, { eventName: e, eventDetails: args });
            });
        }
        // Emit a regular event, for main process listeners
        if (!args) {
            return super.emit(e);
        }
        else if (Array.isArray(args)) {
            return super.emit(e, ...args);
        }
        else {
            return super.emit(e, args);
        }
    };
    /**
     * Throws an error if the release is missing any of the required files for the
     * current platform, otherwise returns the required assets
     */
    _getAssets = (release) => {
        return this.platformConfig.requiredFiles.map((filePattern) => {
            const match = release.assets.find((asset) => asset.name.match(filePattern));
            if (!match)
                throw new Error(`Release is missing a required update file for current platform (${platform})`);
            else
                return match;
        });
    };
    // Downloads the required files for the current platform from the provided release
    _downloadUpdateFromRelease = async (release) => {
        // Find the required files in the release
        const assets = this._getAssets(release);
        // Set variables to track download progress, including calculating the total download size
        const totalSize = assets.reduce((prev, asset) => (prev += asset.size), 0);
        let downloaded = 0;
        let lastEmitPercent = -1;
        const downloadFile = async (asset) => {
            let assetName = asset.name;
            // I believe this is a hack where we download an older version, but
            // give it a new name which is the next prerelease version with
            // "rollback" identifier, necessary to keep the version numbers moving
            // forward
            const rollbackVersion = (0, semver_1.inc)(this.currentVersion, 'prerelease', 'rollback', false);
            const isRollback = (0, semver_1.gte)(this.currentVersion, release.tag_name);
            if (isRollback) {
                if (rollbackVersion === null) {
                    throw new Error('Could not calculate rollback version');
                }
                assetName = asset.name.replace(release.tag_name, rollbackVersion);
            }
            const outputPath = path_1.default.join(this.downloadsDirectory, assetName);
            const request = await this._request;
            const response = await request('GET /repos/{owner}/{repo}/releases/assets/{asset_id}', {
                owner: this.owner,
                repo: this.repo,
                asset_id: asset.id,
                request: {
                    // See https://github.com/octokit/request.js/issues/601
                    parseSuccessResponseBody: false,
                },
                headers: {
                    accept: 'application/octet-stream',
                },
            });
            // The types break down for streaming data with octokit, see
            // https://github.com/octokit/types.ts/issues/606
            const data = response.data;
            const writer = fs_1.default.createWriteStream(outputPath);
            // Keep this arrow function outside of the generator to make sure we're
            // using the right `this`
            const emit = () => {
                this.emit('update-downloading', {
                    downloadStatus: {
                        size: totalSize,
                        progress: downloaded,
                        percent: Math.round((downloaded * 100) / totalSize),
                    },
                    releaseName: release.name,
                    releaseNotes: release.body || '',
                    releaseDate: new Date(release.published_at),
                    updateUrl: release.html_url,
                });
            };
            // Pipe data into a writer to save it to the disk rather than keeping it in memory
            await (0, promises_1.pipeline)(data, 
            // Emit progress events when chunks are downloaded
            async function* (source) {
                for await (const chunk of source) {
                    yield chunk;
                    downloaded += chunk.length;
                    const percent = Math.round((downloaded * 100) / totalSize);
                    // Only emit once the value is greater, to prevent TONS of IPC events
                    if (percent > lastEmitPercent) {
                        emit();
                        lastEmitPercent = percent;
                    }
                }
            }, writer, {
                // Close the file write stream when done
                end: true,
            });
            // To rollback we pretend like this release is ahead of the current
            // release
            if (isRollback && assetName === 'RELEASES') {
                if (rollbackVersion === null) {
                    throw new Error('Could not calculate rollback version');
                }
                const releases = fs_1.default.readFileSync(outputPath, { encoding: 'utf-8' });
                const newReleases = releases.replace(release.tag_name, rollbackVersion);
                fs_1.default.writeFileSync(outputPath, newReleases, { encoding: 'utf-8' });
            }
        };
        for (const asset of assets) {
            await downloadFile(asset);
        }
        fs_1.default.writeFileSync(this.cacheFilePath, release.id.toString(), { encoding: 'utf-8' });
    };
    // Clears the updates folder and cache file
    clearCache = () => {
        try {
            // Delete downloads dir if exists
            if (fs_1.default.existsSync(this.downloadsDirectory)) {
                fs_1.default.rmSync(this.downloadsDirectory, { recursive: true, force: true });
            }
            // Delete cache file if exists
            if (fs_1.default.existsSync(this.cacheFilePath)) {
                fs_1.default.unlinkSync(this.cacheFilePath);
            }
            this._initCache();
        }
        catch (e) {
            this._emitError(e);
        }
    };
    async prepareUpdateFromRelease(release) {
        try {
            this.latestRelease = release;
            const updateDetails = {
                releaseName: release.name,
                releaseNotes: release.body || '',
                releaseDate: new Date(release.published_at),
                updateUrl: release.html_url,
                prerelease: release.prerelease,
            };
            this.emit('update-available', updateDetails);
            // Check if release files are already downloaded/cached
            const cachedReleaseID = this._getCachedReleaseId();
            // If files are not already downloaded, clear the downloads folder/cache file and download the update
            if (!cachedReleaseID || cachedReleaseID !== release.id) {
                this.clearCache();
                // Download the update files
                await this._downloadUpdateFromRelease(release);
                // Load the built in electron auto updater with the files we generated
                this._loadElectronAutoUpdater();
                // Use the built in electron auto updater to install the update
                this._installDownloadedUpdate();
            }
            else if (electron_1.autoUpdater.getFeedURL() !== this.platformConfig.feedUrl) {
                // Load the built in electron auto updater with the files we generated
                this._loadElectronAutoUpdater();
                // Use the built in electron auto updater to install the update
                this._installDownloadedUpdate();
            }
            this.emit('update-downloaded', updateDetails);
        }
        catch (error) {
            this._emitError(error);
        }
    }
    checkForUpdates = async () => {
        try {
            // Get the latest release and its version number
            const latestRelease = await this.getLatestRelease();
            const latestVersion = latestRelease.tag_name;
            if ((0, semver_1.gte)(this.currentVersion, latestVersion)) {
                this.emit('update-not-available');
            }
            else {
                this.prepareUpdateFromRelease(latestRelease);
            }
        }
        catch (error) {
            this._emitError(error);
        }
    };
    quitAndInstall = () => {
        try {
            electron_1.autoUpdater.quitAndInstall();
        }
        catch (e) {
            this._emitError(e);
        }
    };
    // Destroys all related IpcMain listeners
    destroy = () => {
        electron_1.ipcMain.removeHandler(exports.channelName);
        electron_1.ipcMain.removeAllListeners(exports.channelName);
    };
}
// Export function that returns new instance of the updater, to closer match electron's autoUpdater API
const autoUpdater = (config) => {
    return new ElectronGithubAutoUpdater(config);
};
exports.autoUpdater = autoUpdater;
