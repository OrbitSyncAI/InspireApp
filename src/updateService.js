import {
  APP_VERSION,
  LATEST_RELEASE_API,
  RELEASES_API,
  compareVersions,
  detectPlatform,
  pickAssetForPlatform,
} from './version'

/**
 * Fetch latest GitHub Release and compare with installed APP_VERSION.
 * When you publish a new GitHub Release after push, all devices see it on "Check for Updates".
 */
export async function checkForUpdates({ includePrerelease = false } = {}) {
  const platform = detectPlatform()
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  let release
  if (includePrerelease) {
    const listRes = await fetch(`${RELEASES_API}?per_page=10`, { headers })
    if (!listRes.ok) throw new Error(`GitHub API error ${listRes.status}`)
    const list = await listRes.json()
    release = (list || []).find(r => !r.draft) || null
  } else {
    const res = await fetch(LATEST_RELEASE_API, { headers })
    if (res.status === 404) {
      return {
        ok: true,
        hasUpdate: false,
        currentVersion: APP_VERSION,
        latestVersion: APP_VERSION,
        release: null,
        platform,
        message: 'No public releases found yet on GitHub.',
        asset: null,
        allAssets: [],
      }
    }
    if (!res.ok) throw new Error(`GitHub API error ${res.status}`)
    release = await res.json()
  }

  if (!release) {
    return {
      ok: true,
      hasUpdate: false,
      currentVersion: APP_VERSION,
      latestVersion: APP_VERSION,
      release: null,
      platform,
      message: 'No releases available.',
      asset: null,
      allAssets: [],
    }
  }

  const latestVersion = (release.tag_name || release.name || '').replace(/^v/i, '')
  const hasUpdate = compareVersions(latestVersion, APP_VERSION) > 0
  const assets = release.assets || []
  const asset = pickAssetForPlatform(assets, platform)

  return {
    ok: true,
    hasUpdate,
    currentVersion: APP_VERSION,
    latestVersion,
    release: {
      tag: release.tag_name,
      name: release.name,
      body: release.body || '',
      htmlUrl: release.html_url,
      publishedAt: release.published_at,
    },
    platform,
    asset: asset
      ? {
          name: asset.name,
          url: asset.browser_download_url,
          size: asset.size,
          contentType: asset.content_type,
        }
      : null,
    allAssets: assets.map(a => ({
      name: a.name,
      url: a.browser_download_url,
      size: a.size,
    })),
    message: hasUpdate
      ? `Version ${latestVersion} is available (you have ${APP_VERSION}).`
      : `You are on the latest version (${APP_VERSION}).`,
  }
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function openDownload(url, fileName = '') {
  if (!url) return
  const nativeUpdater = window.Capacitor?.Plugins?.InspireUpdater
  if (nativeUpdater?.downloadAndInstall) {
    await nativeUpdater.downloadAndInstall({
      url,
      fileName: fileName || 'InspireApp-update.apk',
    })
    return
  }

  const link = document.createElement('a')
  link.href = url
  link.download = fileName || ''
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
