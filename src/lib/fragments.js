import { mediaUrl } from '../data/routes.js'

/* Loads a route's hidden text fragments from its mapping_fragments.txt
   (one fragment per non-empty line). Cached per folder; missing file → []. */
const cache = new Map()

export function loadFragments(folder) {
  if (!cache.has(folder)) {
    cache.set(
      folder,
      fetch(mediaUrl(folder, 'mapping_fragments.txt'))
        .then((r) => (r.ok ? r.text() : ''))
        .then((t) =>
          t
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean)
        )
        .catch(() => [])
    )
  }
  return cache.get(folder)
}
