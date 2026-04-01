const DICTIONARY_BASE =
  'https://api.dictionaryapi.dev/api/v2/entries/en'

export type DictionaryEntry = {
  word: string
  partOfSpeech: string
  definition: string
}

type ApiMeaning = {
  partOfSpeech?: string
  definitions?: { definition?: string }[]
}

type ApiEntry = {
  word?: string
  meanings?: ApiMeaning[]
}

function firstDefinition(entries: ApiEntry[]): DictionaryEntry | null {
  for (const entry of entries) {
    const meanings = entry.meanings
    if (!meanings?.length) continue
    for (const m of meanings) {
      const def = m.definitions?.[0]?.definition
      if (def) {
        return {
          word: entry.word ?? '',
          partOfSpeech: m.partOfSpeech ?? '',
          definition: def,
        }
      }
    }
  }
  return null
}

/** Resolves to null when the word is unknown (404). */
export async function fetchDictionaryEntry(
  word: string,
  signal: AbortSignal,
): Promise<DictionaryEntry | null> {
  const trimmed = word.trim()
  if (!trimmed) return null

  const res = await fetch(
    `${DICTIONARY_BASE}/${encodeURIComponent(trimmed)}`,
    { signal },
  )

  if (res.status === 404) return null

  if (!res.ok) {
    throw new Error(`Dictionary request failed (${res.status})`)
  }

  const data: unknown = await res.json()
  if (!Array.isArray(data) || data.length === 0) return null

  return firstDefinition(data as ApiEntry[])
}
