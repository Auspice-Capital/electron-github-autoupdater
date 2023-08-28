import axios from 'axios'
import { app, autoUpdater as electronAutoUpdater, BrowserWindow, ipcMain } from 'electron'
import isDev from 'electron-is-dev'
import EventEmitter from 'events'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { gte as semverGte, rcompare as semverCompare } from 'semver'
import { GithubRelease, GithubReleaseAsset } from './types'

// Platform validation
const supportedPlatforms = ['darwin', 'win32', 'linux'] as const
type SupportedPlatformType = typeof supportedPlatforms[number]
function assertPlatform(platform: any): asserts platform is SupportedPlatformType {
  if (!supportedPlatforms.includes(platform)) {
    throw new TypeError(`${platform} is not a supported platform`)
  }
}
const platform = os.platform()
if (platform === 'linux') {
  console.warn(
    'WARNING: Linux is only enabled in electron-github-autoupdater for development purposes, updating does not work on linux'
  )
}
assertPlatform(platform)
if (!supportedPlatforms.includes(platform))
  throw new Error(`Platform: ${platform} is not currently supported by electron-github-autoupdater`)

export const channelName = 'ElectronAutoUpdater'

// Default event types from electron's autoUpdater
const electronAutoUpdaterEventTypes = [
  'error',
  'checking-for-update',
  'update-available',
  'update-not-available',
  'update-downloaded',
  'before-quit-for-update',
] as const
export type ElectronAutoUpdaterEventType = typeof electronAutoUpdaterEventTypes[number]

// Custom event types for this library
const eventTypes = [...electronAutoUpdaterEventTypes, 'update-downloading']
export type AutoUpdaterEventType = ElectronAutoUpdaterEventType | 'update-downloading'

type LastEmit = {
  type: AutoUpdaterEventType
  args: any[]
}

type PlatformConfig = {
  requiredFiles: RegExp[]
  feedUrl: string
}

export type AutoUpdaterOptions = {
  baseUrl?: string
  owner: string
  repo: string
  accessToken: string
  allowPrerelease?: boolean
  shouldForwardEvents?: boolean
  cacheFilePath?: string
  downloadsDirectory?: string
}

class ElectronGithubAutoUpdater extends EventEmitter {
  baseUrl: string
  owner: string
  repo: string
  accessToken: string
  allowPrerelease: boolean
  shouldForwardEvents: boolean
  currentVersion: string
  appName: string
  cacheFilePath: string
  downloadsDirectory: string
  eventTypes: string[]
  lastEmit: LastEmit
  platform: typeof supportedPlatforms[number]
  platformConfig: PlatformConfig
  _headers: Record<string, string>
  latestRelease: GithubRelease | null

  constructor({
    baseUrl = 'https://api.github.com',
    owner,
    repo,
    accessToken,
    allowPrerelease = false,
    shouldForwardEvents = true,
    cacheFilePath = path.join(app.getPath('temp'), app.getName(), 'updates', '.cache'),
    downloadsDirectory = path.join(app.getPath('temp'), app.getName(), 'updates', 'downloads'),
  }: AutoUpdaterOptions) {
    super()

    this.baseUrl = baseUrl
    this.owner = owner
    this.repo = repo
    this.accessToken = accessToken
    this.allowPrerelease = allowPrerelease
    this.shouldForwardEvents = shouldForwardEvents
    this.currentVersion = app.getVersion()
    this.appName = app.getName()
    this.cacheFilePath = cacheFilePath
    this.downloadsDirectory = downloadsDirectory
    this.eventTypes = eventTypes
    this.lastEmit = { type: 'update-not-available', args: [] }
    this.latestRelease = null

    // Github request headers
    this._headers = { Authorization: `token ${this.accessToken}` }

    // TS validate platform
    assertPlatform(platform)
    this.platform = platform
    this.platformConfig = this._getPlatformConfig()

    // Initialize the app
    this._initCache()
    this._registerInterceptors()

    // Register IPC handlers and listeners
    if (this.shouldForwardEvents) this._registerIpcMethods()
  }

  /**************************************************************************************************
   * Add listeners and handlers for IPC
   **************************************************************************************************/
  // Adds listeners for IPC Events
  _registerIpcMethods = () => {
    if (this.shouldForwardEvents) {
      ipcMain.on(channelName, (event, method, args) => {
        switch (method) {
          case 'getStatus':
            event.returnValue = { eventName: this.lastEmit.type, eventDetails: this.lastEmit.args }
            break
          case 'getVersion':
            event.returnValue = this.currentVersion
            break
          default:
            throw new Error(`No listener for ${method}`)
        }
      })

      ipcMain.handle(channelName, async (event, method, args) => {
        switch (method) {
          case 'checkForUpdates':
            return this.checkForUpdates()
          case 'quitAndInstall':
            this.quitAndInstall()
            return true
          case 'clearCache':
            this.clearCache()
            return true
          case 'getLatestRelease':
            return await this.getLatestRelease()
          default:
            throw new Error(`No listener for ${method}`)
        }
      })
    }
  }

  /**************************************************************************************************
   *     Internal Methods
   **************************************************************************************************/

  _emitError(error: any) {
    this.emit('error', error)
    console.error(error)
  }

  _initCache = () => {
    // Create temp dir if not exists
    if (!fs.existsSync(this.downloadsDirectory))
      fs.mkdirSync(this.downloadsDirectory, { recursive: true })
  }

  // Intercept electron's autoUpdater events and forward to renderer
  _registerInterceptors = () => {
    electronAutoUpdater.on('before-quit-for-update', () => this.emit('before-quit-for-update'))
    electronAutoUpdater.on('update-available', () => {
      this.emit('update-downloaded', {
        releaseName: this.latestRelease?.name,
        releaseNotes: this.latestRelease?.body,
        releaseDate: this.latestRelease && new Date(this.latestRelease?.published_at),
        updateUrl: this.latestRelease?.html_url,
        prerelease: this.latestRelease?.prerelease,
      })
    })
    electronAutoUpdater.on('error', (error) => this._emitError(error))
    electronAutoUpdater.on('update-not-available', () => this.emit('update-not-available'))
  }

  // Gets the config for the current platform: files to download, the "feedURL" for electron's autoUpdater
  _getPlatformConfig = (): PlatformConfig => {
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
        feedUrl: path.join(this.downloadsDirectory, 'feed.json'),
      },
    }[this.platform]
  }

  _getCachedReleaseId = () => {
    if (fs.existsSync(this.cacheFilePath)) {
      return parseInt(fs.readFileSync(this.cacheFilePath, { encoding: 'utf-8' }))
    } else {
      return null
    }
  }

  /**
   * Gets all releases from github sorted by version number (most recent first)
   */
  async getReleases(): Promise<GithubRelease[]> {
    const response = await axios.get(
      `${this.baseUrl}/repos/${this.owner}/${this.repo}/releases?per_page=100`,
      {
        headers: this._headers,
      }
    )

    const validateAssets = (release: GithubRelease) => {
      try {
        this._getAssets(release)
        return true
      } catch (error) {
        return false
      }
    }

    const releases: GithubRelease[] = response.data.filter(
      (release: GithubRelease) =>
        !release.draft && (this.allowPrerelease || !release.prerelease) && validateAssets(release)
    )

    releases.sort((a, b) => semverCompare(a.name, b.name))
    return releases
  }

  // Gets the latest release from github
  getLatestRelease = async () => {
    // If already checking, log an error
    if (this.lastEmit.type === 'checking-for-update') {
      throw new Error('Already checking for updates, cannot check again.')
    }

    // First emit that we are checking
    this.emit('checking-for-update')

    const releases: GithubRelease[] = await this.getReleases()

    if (releases.length === 0) {
      throw new Error('No releases found')
    }
    this.latestRelease = releases[0]
    return releases[0]
  }

  // Preps the default electron autoUpdater to install the update
  _loadElectronAutoUpdater = (release: GithubRelease) => {
    if (!isDev) {
      electronAutoUpdater.setFeedURL({ url: this.platformConfig.feedUrl })
    }
  }

  // Uses electron autoUpdater to install the downloaded update
  _installDownloadedUpdate = () => {
    if (!isDev) {
      try {
        electronAutoUpdater.checkForUpdates()
      } catch (e) {
        this._emitError(e)
      }
    } else {
      console.error('Cannot install an update while running in dev mode.')
      // Fake an install for testing purposes
      electronAutoUpdater.emit('update-available')
    }
  }

  // Emit event, also optionally forward to renderer windows
  emit = (e: AutoUpdaterEventType, args?: any) => {
    // Store the last emit, so we can send to renderer listeners who were added in the middle of the process
    // rather than re-performing the work
    this.lastEmit = { type: e, args: args }

    // Emit over IPC also
    if (this.shouldForwardEvents) {
      BrowserWindow.getAllWindows().map((window) => {
        window.webContents.send(channelName, { eventName: e, eventDetails: args })
      })
    }

    // Emit a regular event, for main process listeners
    if (!args) {
      return super.emit(e)
    } else if (Array.isArray(args)) {
      return super.emit(e, ...args)
    } else {
      return super.emit(e, args)
    }
  }

  /**
   * Throws an error if the release is missing any of the required files for the
   * current platform, otherwise returns the required assets
   */
  _getAssets = (release: GithubRelease) => {
    return this.platformConfig.requiredFiles.map((filePattern) => {
      const match = release.assets.find((asset) => asset.name.match(filePattern))
      if (!match)
        throw new Error(
          `Release is missing a required update file for current platform (${platform})`
        )
      else return match
    })
  }

  // Downloads the required files for the current platform from the provided release
  _downloadUpdateFromRelease = async (release: GithubRelease) => {
    // Find the required files in the release
    const assets = this._getAssets(release)

    // Set variables to track download progress, including calculating the total download size
    const totalSize = assets.reduce((prev, asset) => (prev += asset.size), 0)
    let downloaded = 0
    let lastEmitPercent = -1

    const downloadFile = (asset: GithubReleaseAsset) => {
      return new Promise(async (resolve, reject) => {
        const outputPath = path.join(this.downloadsDirectory, asset.name)
        const assetUrl = `${this.baseUrl}/repos/${this.owner}/${this.repo}/releases/assets/${asset.id}`

        const { data } = await axios.get(assetUrl, {
          headers: {
            ...this._headers,
            Accept: 'application/octet-stream',
          },
          responseType: 'stream',
        })

        const writer = fs.createWriteStream(outputPath)

        // Emit a progress event when a chunk is downloaded
        data.on('data', (chunk: Buffer) => {
          downloaded += chunk.length
          const percent = Math.round((downloaded * 100) / totalSize)

          // Only emit once the value is greater, to prevent TONS of IPC events
          if (percent > lastEmitPercent) {
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
            })

            lastEmitPercent = percent
          }
        })

        // Pipe data into a writer to save it to the disk rather than keeping it in memory
        data.pipe(writer)

        data.on('end', () => {
          resolve(true)
        })
      })
    }

    for await (const asset of assets) {
      await downloadFile(asset)
    }

    fs.writeFileSync(this.cacheFilePath, release.id.toString(), { encoding: 'utf-8' })
  }

  // Clears the updates folder and cache file
  clearCache = () => {
    try {
      // Delete downloads dir if exists
      if (fs.existsSync(this.downloadsDirectory)) {
        fs.rmSync(this.downloadsDirectory, { recursive: true, force: true })
      }

      // Delete cache file if exists
      if (fs.existsSync(this.cacheFilePath)) {
        fs.unlinkSync(this.cacheFilePath)
      }

      this._initCache()
    } catch (e) {
      this._emitError(e)
    }
  }

  async prepareUpdateFromRelease(release: GithubRelease) {
    try {
      const updateDetails = {
        releaseName: release.name,
        releaseNotes: release.body || '',
        releaseDate: new Date(release.published_at),
        updateUrl: release.html_url,
        prerelease: release.prerelease,
      }
      this.emit('update-available', updateDetails)

      // Check if release files are already downloaded/cached
      const cachedReleaseID = this._getCachedReleaseId()

      // If files are not already downloaded, clear the downloads folder/cache file and download the update
      if (!cachedReleaseID || cachedReleaseID !== release.id) {
        this.clearCache()
        // Download the update files
        await this._downloadUpdateFromRelease(release)

        // Load the built in electron auto updater with the files we generated
        this._loadElectronAutoUpdater(release)
        // Use the built in electron auto updater to install the update
        this._installDownloadedUpdate()
        return true
      } else {
        if (electronAutoUpdater.getFeedURL() === this.platformConfig.feedUrl) {
          this.emit('update-downloaded', updateDetails)
        } else {
          // Load the built in electron auto updater with the files we generated
          this._loadElectronAutoUpdater(release)
          // Use the built in electron auto updater to install the update
          this._installDownloadedUpdate()
          return true
        }
      }
    } catch (error) {
      this._emitError(error)
    }
  }

  checkForUpdates = async () => {
    try {
      // Get the latest release and its version number
      const latestRelease = await this.getLatestRelease()
      const latestVersion = latestRelease.tag_name
      if (semverGte(this.currentVersion, latestVersion)) {
        this.emit('update-not-available')
        return false
      } else {
        return this.prepareUpdateFromRelease(latestRelease)
      }
    } catch (error) {
      this._emitError(error)
    }
  }

  quitAndInstall = () => {
    try {
      electronAutoUpdater.quitAndInstall()
    } catch (e) {
      this._emitError(e)
    }
  }

  // Destroys all related IpcMain listeners
  destroy = () => {
    ipcMain.removeHandler(channelName)
    ipcMain.removeAllListeners(channelName)
  }
}

// Export function that returns new instance of the updater, to closer match electron's autoUpdater API
export const autoUpdater = (config: AutoUpdaterOptions) => {
  return new ElectronGithubAutoUpdater(config)
}
