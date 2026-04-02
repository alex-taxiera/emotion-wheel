const DICTIONARY_BASE =
  'https://api.dictionaryapi.dev/api/v2/entries/en'

/** One gloss line from the API (may share a part of speech with neighbors). */
export type DictionarySense = {
  partOfSpeech: string
  definition: string
}

export type DictionaryEntry = {
  word: string
  senses: DictionarySense[]
}

type ApiMeaning = {
  partOfSpeech?: string
  definitions?: { definition?: string }[]
}

type ApiEntry = {
  word?: string
  meanings?: ApiMeaning[]
}

function collectAllSenses(entries: ApiEntry[]): DictionaryEntry | null {
  const senses: DictionarySense[] = []
  let word = ''
  for (const entry of entries) {
    if (entry.word) word = entry.word
    for (const m of entry.meanings ?? []) {
      const pos = m.partOfSpeech ?? ''
      for (const d of m.definitions ?? []) {
        const def = d.definition?.trim()
        if (def) senses.push({ partOfSpeech: pos, definition: def })
      }
    }
  }
  if (senses.length === 0) return null
  return { word, senses }
}

/** Resolves to null when the word is unknown (404) or has no definitions. */
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

  return collectAllSenses(data as ApiEntry[])
}
