/// <reference types="node" />
import EventEmitter from 'events';
import { GithubRelease, GithubReleaseAsset } from './types';
declare const supportedPlatforms: readonly ["darwin", "win32", "linux"];
export declare const channelName = "ElectronAutoUpdater";
declare const electronAutoUpdaterEventTypes: readonly ["error", "checking-for-update", "update-available", "update-not-available", "update-downloaded", "before-quit-for-update"];
export declare type ElectronAutoUpdaterEventType = typeof electronAutoUpdaterEventTypes[number];
export declare type AutoUpdaterEventType = ElectronAutoUpdaterEventType | 'update-downloading';
declare type LastEmit = {
    type: AutoUpdaterEventType;
    args: any[];
};
declare type PlatformConfig = {
    requiredFiles: RegExp[];
    feedUrl: string;
};
export declare type AutoUpdaterOptions = {
    baseUrl?: string;
    owner: string;
    repo: string;
    accessToken: string;
    allowPrerelease?: boolean;
    shouldForwardEvents?: boolean;
    cacheFilePath?: string;
    downloadsDirectory?: string;
};
declare class ElectronGithubAutoUpdater extends EventEmitter {
    baseUrl: string;
    owner: string;
    repo: string;
    accessToken: string;
    allowPrerelease: boolean;
    shouldForwardEvents: boolean;
    currentVersion: string;
    appName: string;
    cacheFilePath: string;
    downloadsDirectory: string;
    eventTypes: string[];
    lastEmit: LastEmit;
    platform: typeof supportedPlatforms[number];
    platformConfig: PlatformConfig;
    _headers: Record<string, string>;
    latestRelease: GithubRelease | null;
    constructor({ baseUrl, owner, repo, accessToken, allowPrerelease, shouldForwardEvents, cacheFilePath, downloadsDirectory, }: AutoUpdaterOptions);
    /**************************************************************************************************
     * Add listeners and handlers for IPC
     **************************************************************************************************/
    _registerIpcMethods: () => void;
    /**************************************************************************************************
     *     Internal Methods
     **************************************************************************************************/
    _emitError(error: any): void;
    _initCache: () => void;
    _registerInterceptors: () => void;
    _getPlatformConfig: () => PlatformConfig;
    _getCachedReleaseId: () => number | null;
    /**
     * Gets all releases from github sorted by version number (most recent first)
     */
    getReleases(): Promise<GithubRelease[]>;
    getLatestRelease: () => Promise<GithubRelease>;
    _loadElectronAutoUpdater: () => void;
    _installDownloadedUpdate: () => void;
    emit: (e: AutoUpdaterEventType, args?: any) => boolean;
    /**
     * Throws an error if the release is missing any of the required files for the
     * current platform, otherwise returns the required assets
     */
    _getAssets: (release: GithubRelease) => GithubReleaseAsset[];
    _downloadUpdateFromRelease: (release: GithubRelease) => Promise<void>;
    clearCache: () => void;
    prepareUpdateFromRelease(release: GithubRelease): Promise<true | undefined>;
    checkForUpdates: () => Promise<boolean | undefined>;
    quitAndInstall: () => void;
    destroy: () => void;
}
export declare const autoUpdater: (config: AutoUpdaterOptions) => ElectronGithubAutoUpdater;
export {};
