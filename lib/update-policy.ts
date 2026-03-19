const UPDATE_GITHUB_OWNER = (process.env.UPDATE_GITHUB_OWNER ?? 'AlexissHH').trim().toLowerCase()
const UPDATE_GITHUB_REPO = (process.env.UPDATE_GITHUB_REPO ?? 'stockmaster-releases').trim().toLowerCase()

export function normalizeUpdateUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }

  if (parsed.protocol !== 'https:') return null
  if (parsed.hostname.trim().toLowerCase() !== 'github.com') return null

  const normalizedPath = parsed.pathname.trim().toLowerCase()
  const allowedPrefix = `/${UPDATE_GITHUB_OWNER}/${UPDATE_GITHUB_REPO}/releases`
  if (!normalizedPath.startsWith(allowedPrefix)) return null

  return parsed.toString()
}
