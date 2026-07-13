/** App identity — bump this on every release so devices show the new version. */
export const APP_NAME = 'InspireApp'
export const APP_VERSION = import.meta.env?.VITE_APP_VERSION || '1.1.0'
export const APP_BUILD = import.meta.env?.VITE_APP_BUILD || '2026.07.09'
export const GITHUB_OWNER = 'OrbitSyncAI'
export const GITHUB_REPO = 'InspireApp'
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`
export const RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`
export const LATEST_RELEASE_API = `${RELEASES_API}/latest`
export const RELEASES_PAGE = `${GITHUB_REPO_URL}/releases`
export const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://ioghhfomesmpslubvmvq.supabase.co'
export const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ffsX161EXZnTiSSotQWdEw_xlemyubc'

/** Parse semver like 1.2.3 or v1.2.3 → [1,2,3] */
export function parseVersion(v) {
  if (!v) return [0, 0, 0]
  const cleaned = String(v).trim().replace(/^v/i, '').split(/[-+]/)[0]
  const parts = cleaned.split('.').map(n => parseInt(n, 10) || 0)
  while (parts.length < 3) parts.push(0)
  return parts.slice(0, 3)
}

/** Returns 1 if a > b, -1 if a < b, 0 if equal */
export function compareVersions(a, b) {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1
    if (pa[i] < pb[i]) return -1
  }
  return 0
}

export function detectPlatform() {
  const envPlatform = import.meta.env?.VITE_APP_PLATFORM
  const normalizedEnvPlatform = ({
    win: 'windows',
    windows: 'windows',
    mac: 'macos',
    macos: 'macos',
    linux: 'linux',
    android: 'android',
    ios: 'ios',
    web: 'web',
  })[envPlatform]
  if (normalizedEnvPlatform) return normalizedEnvPlatform

  if (typeof navigator === 'undefined') return 'web'
  const ua = navigator.userAgent || ''
  const platform = navigator.platform || ''

  // Capacitor / hybrid hints
  if (window.Capacitor?.getPlatform) {
    try {
      const p = window.Capacitor.getPlatform()
      if (p === 'android' || p === 'ios') return p
    } catch {}
  }

  if (/Android/i.test(ua)) return 'android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Win/i.test(platform) || /Windows/i.test(ua)) return 'windows'
  if (/Mac/i.test(platform) && !/iPhone|iPad|iPod/i.test(ua)) return 'macos'
  if (/Linux/i.test(platform) || /Linux/i.test(ua)) return 'linux'
  return 'web'
}

export function platformLabel(p) {
  return ({
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux',
    android: 'Android',
    ios: 'iOS',
    web: 'Web Final',
  })[p] || p
}

/** Match GitHub release assets to the current platform */
export function pickAssetForPlatform(assets, platform) {
  if (!Array.isArray(assets) || assets.length === 0) return null
  const names = assets.map(a => ({ a, n: (a.name || '').toLowerCase() }))

  const find = (preds) => {
    for (const pred of preds) {
      const hit = names.find(({ n }) => pred(n))
      if (hit) return hit.a
    }
    return null
  }

  switch (platform) {
    case 'windows':
      return find([
        n => n.endsWith('.exe') && (n.includes('setup') || n.includes('inspire')),
        n => n.endsWith('.exe'),
        n => n.endsWith('.msi'),
      ])
    case 'macos':
      return find([
        n => n.endsWith('.dmg'),
        n => n.endsWith('.pkg'),
        n => n.endsWith('.zip') && n.includes('mac'),
      ])
    case 'linux':
      return find([
        n => n.endsWith('.appimage'),
        n => n.endsWith('.deb'),
        n => n.endsWith('.rpm'),
      ])
    case 'android':
      return find([
        n => n.endsWith('.apk'),
        n => n.endsWith('.aab'),
      ])
    case 'ios':
      return find([
        n => n.endsWith('.ipa'),
      ])
    default:
      return null
  }
}
