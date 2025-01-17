"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoUpdater = exports.channelName = void 0;
var axios_1 = __importDefault(require("axios"));
var electron_1 = require("electron");
var electron_is_dev_1 = __importDefault(require("electron-is-dev"));
var events_1 = __importDefault(require("events"));
var fs_1 = __importDefault(require("fs"));
var os_1 = __importDefault(require("os"));
var path_1 = __importDefault(require("path"));
var semver_1 = require("semver");
// Platform validation
var supportedPlatforms = ['darwin', 'win32', 'linux'];
function assertPlatform(platform) {
    if (!supportedPlatforms.includes(platform)) {
        throw new TypeError("".concat(platform, " is not a supported platform"));
    }
}
var platform = os_1.default.platform();
if (platform === 'linux') {
    console.warn('WARNING: Linux is only enabled in electron-github-autoupdater for development purposes, updating does not work on linux');
}
assertPlatform(platform);
if (!supportedPlatforms.includes(platform))
    throw new Error("Platform: ".concat(platform, " is not currently supported by electron-github-autoupdater"));
exports.channelName = 'ElectronAutoUpdater';
// Default event types from electron's autoUpdater
var electronAutoUpdaterEventTypes = [
    'error',
    'checking-for-update',
    'update-available',
    'update-not-available',
    'update-downloaded',
    'before-quit-for-update',
];
// Custom event types for this library
var eventTypes = __spreadArray(__spreadArray([], electronAutoUpdaterEventTypes, true), ['update-downloading'], false);
var ElectronGithubAutoUpdater = /** @class */ (function (_super) {
    __extends(ElectronGithubAutoUpdater, _super);
    function ElectronGithubAutoUpdater(_a) {
        var _b = _a.baseUrl, baseUrl = _b === void 0 ? 'https://api.github.com' : _b, owner = _a.owner, repo = _a.repo, accessToken = _a.accessToken, _c = _a.allowPrerelease, allowPrerelease = _c === void 0 ? false : _c, _d = _a.shouldForwardEvents, shouldForwardEvents = _d === void 0 ? true : _d, _e = _a.cacheFilePath, cacheFilePath = _e === void 0 ? path_1.default.join(electron_1.app.getPath('temp'), electron_1.app.getName(), 'updates', '.cache') : _e, _f = _a.downloadsDirectory, downloadsDirectory = _f === void 0 ? path_1.default.join(electron_1.app.getPath('temp'), electron_1.app.getName(), 'updates', 'downloads') : _f;
        var _this = _super.call(this) || this;
        /**************************************************************************************************
         * Add listeners and handlers for IPC
         **************************************************************************************************/
        // Adds listeners for IPC Events
        _this._registerIpcMethods = function () {
            if (_this.shouldForwardEvents) {
                electron_1.ipcMain.on(exports.channelName, function (event, method, args) {
                    switch (method) {
                        case 'getStatus':
                            event.returnValue = { eventName: _this.lastEmit.type, eventDetails: _this.lastEmit.args };
                            break;
                        case 'getVersion':
                            event.returnValue = _this.currentVersion;
                            break;
                        default:
                            throw new Error("No listener for ".concat(method));
                    }
                });
                electron_1.ipcMain.handle(exports.channelName, function (event, method, args) { return __awaiter(_this, void 0, void 0, function () {
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                _a = method;
                                switch (_a) {
                                    case 'checkForUpdates': return [3 /*break*/, 1];
                                    case 'quitAndInstall': return [3 /*break*/, 2];
                                    case 'clearCache': return [3 /*break*/, 3];
                                    case 'getLatestRelease': return [3 /*break*/, 4];
                                }
                                return [3 /*break*/, 6];
                            case 1: return [2 /*return*/, this.checkForUpdates()];
                            case 2:
                                this.quitAndInstall();
                                return [2 /*return*/, true];
                            case 3:
                                this.clearCache();
                                return [2 /*return*/, true];
                            case 4: return [4 /*yield*/, this.getLatestRelease()];
                            case 5: return [2 /*return*/, _b.sent()];
                            case 6: throw new Error("No listener for ".concat(method));
                        }
                    });
                }); });
            }
        };
        _this._initCache = function () {
            // Create temp dir if not exists
            if (!fs_1.default.existsSync(_this.downloadsDirectory))
                fs_1.default.mkdirSync(_this.downloadsDirectory, { recursive: true });
        };
        // Intercept electron's autoUpdater events and forward to renderer
        _this._registerInterceptors = function () {
            electron_1.autoUpdater.on('before-quit-for-update', function () { return _this.emit('before-quit-for-update'); });
            electron_1.autoUpdater.on('update-available', function () {
                var _a, _b, _c, _d, _e;
                _this.emit('update-downloaded', {
                    releaseName: (_a = _this.latestRelease) === null || _a === void 0 ? void 0 : _a.name,
                    releaseNotes: (_b = _this.latestRelease) === null || _b === void 0 ? void 0 : _b.body,
                    releaseDate: _this.latestRelease && new Date((_c = _this.latestRelease) === null || _c === void 0 ? void 0 : _c.published_at),
                    updateUrl: (_d = _this.latestRelease) === null || _d === void 0 ? void 0 : _d.html_url,
                    prerelease: (_e = _this.latestRelease) === null || _e === void 0 ? void 0 : _e.prerelease,
                });
            });
            electron_1.autoUpdater.on('error', function (error) { return _this._emitError(error); });
            electron_1.autoUpdater.on('update-not-available', function () { return _this.emit('update-not-available'); });
        };
        // Gets the config for the current platform: files to download, the "feedURL" for electron's autoUpdater
        _this._getPlatformConfig = function () {
            return {
                win32: {
                    requiredFiles: [/[^ ]*-full\.nupkg/gim, /RELEASES/],
                    feedUrl: _this.downloadsDirectory,
                },
                linux: {
                    requiredFiles: [/[^ ]*-full\.nupkg/gim, /RELEASES/],
                    feedUrl: _this.downloadsDirectory,
                },
                darwin: {
                    requiredFiles: [/[^ ]*\.zip/gim, /feed.json/],
                    feedUrl: path_1.default.join(_this.downloadsDirectory, 'feed.json'),
                },
            }[_this.platform];
        };
        _this._getCachedReleaseId = function () {
            if (fs_1.default.existsSync(_this.cacheFilePath)) {
                return parseInt(fs_1.default.readFileSync(_this.cacheFilePath, { encoding: 'utf-8' }));
            }
            else {
                return null;
            }
        };
        // Gets the latest release from github
        _this.getLatestRelease = function () { return __awaiter(_this, void 0, void 0, function () {
            var releases;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // If already checking, log an error
                        if (this.lastEmit.type === 'checking-for-update') {
                            throw new Error('Already checking for updates, cannot check again.');
                        }
                        // First emit that we are checking
                        this.emit('checking-for-update');
                        return [4 /*yield*/, this.getReleases()];
                    case 1:
                        releases = _a.sent();
                        if (releases.length === 0) {
                            throw new Error('No releases found');
                        }
                        this.latestRelease = releases[0];
                        return [2 /*return*/, releases[0]];
                }
            });
        }); };
        // Preps the default electron autoUpdater to install the update
        _this._loadElectronAutoUpdater = function () {
            if (!electron_is_dev_1.default) {
                electron_1.autoUpdater.setFeedURL({ url: _this.platformConfig.feedUrl });
            }
        };
        // Uses electron autoUpdater to install the downloaded update
        _this._installDownloadedUpdate = function () {
            if (!electron_is_dev_1.default) {
                try {
                    electron_1.autoUpdater.checkForUpdates();
                }
                catch (e) {
                    _this._emitError(e);
                }
            }
            else {
                console.error('Cannot install an update while running in dev mode.');
                // Fake an install for testing purposes
                electron_1.autoUpdater.emit('update-available');
            }
        };
        // Emit event, also optionally forward to renderer windows
        _this.emit = function (e, args) {
            // Store the last emit, so we can send to renderer listeners who were added in the middle of the process
            // rather than re-performing the work
            _this.lastEmit = { type: e, args: args };
            // Emit over IPC also
            if (_this.shouldForwardEvents) {
                electron_1.BrowserWindow.getAllWindows().map(function (window) {
                    window.webContents.send(exports.channelName, { eventName: e, eventDetails: args });
                });
            }
            // Emit a regular event, for main process listeners
            if (!args) {
                return _super.prototype.emit.call(_this, e);
            }
            else if (Array.isArray(args)) {
                return _super.prototype.emit.apply(_this, __spreadArray([e], args, false));
            }
            else {
                return _super.prototype.emit.call(_this, e, args);
            }
        };
        /**
         * Throws an error if the release is missing any of the required files for the
         * current platform, otherwise returns the required assets
         */
        _this._getAssets = function (release) {
            return _this.platformConfig.requiredFiles.map(function (filePattern) {
                var match = release.assets.find(function (asset) { return asset.name.match(filePattern); });
                if (!match)
                    throw new Error("Release is missing a required update file for current platform (".concat(platform, ")"));
                else
                    return match;
            });
        };
        // Downloads the required files for the current platform from the provided release
        _this._downloadUpdateFromRelease = function (release) { return __awaiter(_this, void 0, void 0, function () {
            var assets, totalSize, downloaded, lastEmitPercent, downloadFile, assets_1, assets_1_1, asset, e_1_1;
            var _this = this;
            var e_1, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        assets = this._getAssets(release);
                        totalSize = assets.reduce(function (prev, asset) { return (prev += asset.size); }, 0);
                        downloaded = 0;
                        lastEmitPercent = -1;
                        downloadFile = function (asset) {
                            return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                                var assetName, rollbackVersion, isRollback, outputPath, assetUrl, data, writer;
                                var _this = this;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            assetName = asset.name;
                                            rollbackVersion = (0, semver_1.inc)(this.currentVersion, 'prerelease', 'rollback', false);
                                            isRollback = (0, semver_1.gte)(this.currentVersion, release.tag_name);
                                            if (isRollback) {
                                                if (rollbackVersion === null) {
                                                    return [2 /*return*/, reject('Could not calculate rollback version')];
                                                }
                                                assetName = asset.name.replace(release.tag_name, rollbackVersion);
                                            }
                                            outputPath = path_1.default.join(this.downloadsDirectory, assetName);
                                            assetUrl = "".concat(this.baseUrl, "/repos/").concat(this.owner, "/").concat(this.repo, "/releases/assets/").concat(asset.id);
                                            return [4 /*yield*/, axios_1.default.get(assetUrl, {
                                                    headers: __assign(__assign({}, this._headers), { Accept: 'application/octet-stream' }),
                                                    responseType: 'stream',
                                                })];
                                        case 1:
                                            data = (_a.sent()).data;
                                            writer = fs_1.default.createWriteStream(outputPath);
                                            // Emit a progress event when a chunk is downloaded
                                            data.on('data', function (chunk) {
                                                downloaded += chunk.length;
                                                var percent = Math.round((downloaded * 100) / totalSize);
                                                // Only emit once the value is greater, to prevent TONS of IPC events
                                                if (percent > lastEmitPercent) {
                                                    _this.emit('update-downloading', {
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
                                                    lastEmitPercent = percent;
                                                }
                                            });
                                            // Pipe data into a writer to save it to the disk rather than keeping it in memory
                                            data.pipe(writer);
                                            data.on('end', function () {
                                                writer.close(function () {
                                                    if (isRollback && assetName === 'RELEASES') {
                                                        if (rollbackVersion === null) {
                                                            return reject('Could not calculate rollback version');
                                                        }
                                                        var releases = fs_1.default.readFileSync(outputPath, { encoding: 'utf-8' });
                                                        var newReleases = releases.replace(release.tag_name, rollbackVersion);
                                                        fs_1.default.writeFileSync(outputPath, newReleases, { encoding: 'utf-8' });
                                                    }
                                                    resolve(true);
                                                });
                                            });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        };
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 7, 8, 13]);
                        assets_1 = __asyncValues(assets);
                        _b.label = 2;
                    case 2: return [4 /*yield*/, assets_1.next()];
                    case 3:
                        if (!(assets_1_1 = _b.sent(), !assets_1_1.done)) return [3 /*break*/, 6];
                        asset = assets_1_1.value;
                        return [4 /*yield*/, downloadFile(asset)];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5: return [3 /*break*/, 2];
                    case 6: return [3 /*break*/, 13];
                    case 7:
                        e_1_1 = _b.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 13];
                    case 8:
                        _b.trys.push([8, , 11, 12]);
                        if (!(assets_1_1 && !assets_1_1.done && (_a = assets_1.return))) return [3 /*break*/, 10];
                        return [4 /*yield*/, _a.call(assets_1)];
                    case 9:
                        _b.sent();
                        _b.label = 10;
                    case 10: return [3 /*break*/, 12];
                    case 11:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 12: return [7 /*endfinally*/];
                    case 13:
                        fs_1.default.writeFileSync(this.cacheFilePath, release.id.toString(), { encoding: 'utf-8' });
                        return [2 /*return*/];
                }
            });
        }); };
        // Clears the updates folder and cache file
        _this.clearCache = function () {
            try {
                // Delete downloads dir if exists
                if (fs_1.default.existsSync(_this.downloadsDirectory)) {
                    fs_1.default.rmSync(_this.downloadsDirectory, { recursive: true, force: true });
                }
                // Delete cache file if exists
                if (fs_1.default.existsSync(_this.cacheFilePath)) {
                    fs_1.default.unlinkSync(_this.cacheFilePath);
                }
                _this._initCache();
            }
            catch (e) {
                _this._emitError(e);
            }
        };
        _this.checkForUpdates = function () { return __awaiter(_this, void 0, void 0, function () {
            var latestRelease, latestVersion, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getLatestRelease()];
                    case 1:
                        latestRelease = _a.sent();
                        latestVersion = latestRelease.tag_name;
                        if ((0, semver_1.gte)(this.currentVersion, latestVersion)) {
                            this.emit('update-not-available');
                        }
                        else {
                            this.prepareUpdateFromRelease(latestRelease);
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        this._emitError(error_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        _this.quitAndInstall = function () {
            try {
                electron_1.autoUpdater.quitAndInstall();
            }
            catch (e) {
                _this._emitError(e);
            }
        };
        // Destroys all related IpcMain listeners
        _this.destroy = function () {
            electron_1.ipcMain.removeHandler(exports.channelName);
            electron_1.ipcMain.removeAllListeners(exports.channelName);
        };
        _this.baseUrl = baseUrl;
        _this.owner = owner;
        _this.repo = repo;
        _this.accessToken = accessToken;
        _this.allowPrerelease = allowPrerelease;
        _this.shouldForwardEvents = shouldForwardEvents;
        _this.currentVersion = electron_1.app.getVersion();
        _this.appName = electron_1.app.getName();
        _this.cacheFilePath = cacheFilePath;
        _this.downloadsDirectory = downloadsDirectory;
        _this.eventTypes = eventTypes;
        _this.lastEmit = { type: 'update-not-available', args: [] };
        _this.latestRelease = null;
        // Github request headers
        _this._headers = { Authorization: "token ".concat(_this.accessToken) };
        // TS validate platform
        assertPlatform(platform);
        _this.platform = platform;
        _this.platformConfig = _this._getPlatformConfig();
        // Initialize the app
        _this._initCache();
        _this._registerInterceptors();
        // Register IPC handlers and listeners
        if (_this.shouldForwardEvents)
            _this._registerIpcMethods();
        return _this;
    }
    /**************************************************************************************************
     *     Internal Methods
     **************************************************************************************************/
    ElectronGithubAutoUpdater.prototype._emitError = function (error) {
        this.emit('error', error);
        console.error(error);
    };
    /**
     * Gets all releases from github sorted by version number (most recent first)
     */
    ElectronGithubAutoUpdater.prototype.getReleases = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, validateAssets, releases;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, axios_1.default.get("".concat(this.baseUrl, "/repos/").concat(this.owner, "/").concat(this.repo, "/releases?per_page=100"), {
                            headers: this._headers,
                        })];
                    case 1:
                        response = _a.sent();
                        validateAssets = function (release) {
                            try {
                                _this._getAssets(release);
                                return true;
                            }
                            catch (error) {
                                return false;
                            }
                        };
                        releases = response.data.filter(function (release) {
                            return !release.draft && (_this.allowPrerelease || !release.prerelease) && validateAssets(release);
                        });
                        releases.sort(function (a, b) { return (0, semver_1.rcompare)(a.name, b.name); });
                        return [2 /*return*/, releases];
                }
            });
        });
    };
    ElectronGithubAutoUpdater.prototype.prepareUpdateFromRelease = function (release) {
        return __awaiter(this, void 0, void 0, function () {
            var updateDetails, cachedReleaseID, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        this.latestRelease = release;
                        updateDetails = {
                            releaseName: release.name,
                            releaseNotes: release.body || '',
                            releaseDate: new Date(release.published_at),
                            updateUrl: release.html_url,
                            prerelease: release.prerelease,
                        };
                        this.emit('update-available', updateDetails);
                        cachedReleaseID = this._getCachedReleaseId();
                        if (!(!cachedReleaseID || cachedReleaseID !== release.id)) return [3 /*break*/, 2];
                        this.clearCache();
                        // Download the update files
                        return [4 /*yield*/, this._downloadUpdateFromRelease(release)
                            // Load the built in electron auto updater with the files we generated
                        ];
                    case 1:
                        // Download the update files
                        _a.sent();
                        // Load the built in electron auto updater with the files we generated
                        this._loadElectronAutoUpdater();
                        // Use the built in electron auto updater to install the update
                        this._installDownloadedUpdate();
                        return [3 /*break*/, 3];
                    case 2:
                        if (electron_1.autoUpdater.getFeedURL() !== this.platformConfig.feedUrl) {
                            // Load the built in electron auto updater with the files we generated
                            this._loadElectronAutoUpdater();
                            // Use the built in electron auto updater to install the update
                            this._installDownloadedUpdate();
                        }
                        _a.label = 3;
                    case 3:
                        this.emit('update-downloaded', updateDetails);
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _a.sent();
                        this._emitError(error_2);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return ElectronGithubAutoUpdater;
}(events_1.default));
// Export function that returns new instance of the updater, to closer match electron's autoUpdater API
var autoUpdater = function (config) {
    return new ElectronGithubAutoUpdater(config);
};
exports.autoUpdater = autoUpdater;
