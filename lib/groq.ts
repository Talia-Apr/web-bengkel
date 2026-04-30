const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_MODEL   = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'

export const isSmallModel = false

export class OllamaTimeoutError extends Error {
  constructor(ms: number) {
    super(`AI tidak merespons dalam ${ms / 1000} detik.`)
    this.name = 'OllamaTimeoutError'
  }
}

export async function ollamaGenerate(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; timeoutMs?: number }
): Promise<string> {
  const timeoutMs  = options?.timeoutMs ?? 30_000
  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        temperature: options?.temperature ?? 0,
        max_tokens:  1000,
        stream:      false,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Groq Error ${res.status}: ${err.error?.message ?? 'Unknown'}`)
    }

    const data = await res.json()
    let content = data.choices[0]?.message?.content ?? ''

    // Bersihkan output model
    content = content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```sql\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    return content
  } catch (err: any) {
    if (err?.name === 'AbortError' || controller.signal.aborted) {
      throw new OllamaTimeoutError(timeoutMs)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export function validateSQL(sql: string): { valid: boolean; reason?: string } {
  const up = sql.trim().toUpperCase().replace(/\s+/g, ' ')
  if (!up.startsWith('SELECT')) {
    return { valid: false, reason: 'Query harus dimulai dengan SELECT' }
  }
  const forbidden = ['INSERT','UPDATE','DELETE','DROP','ALTER','CREATE','TRUNCATE','REPLACE','EXEC','EXECUTE','CALL','GRANT','REVOKE']
  for (const kw of forbidden) {
    if (new RegExp(`\\b${kw}\\b`).test(up)) {
      return { valid: false, reason: `Operasi '${kw}' tidak diizinkan` }
    }
  }
  return { valid: true }
}

export function cleanSQL(raw: string): string {
  let sql = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```sql\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  const lines = sql.split('\n')
  const idx   = lines.findIndex(l => l.trim().toUpperCase().startsWith('SELECT'))
  if (idx > 0) sql = lines.slice(idx).join('\n').trim()

  sql = sql.replace(/--.*$/gm, '').replace(/;+\s*$/, '').trim()

  if (!/\bLIMIT\b/i.test(sql)) sql += '\nLIMIT 500'

  return sql
}

export function fixDuplicateAliases(sql: string): string {
  const SQL_KW = /^(ON|WHERE|SET|AND|OR|LEFT|RIGHT|INNER|OUTER|CROSS|FULL|GROUP|ORDER|HAVING|LIMIT|SELECT|UNION|CASE|WHEN|THEN|ELSE|END)$/i
  const joinRe = /\b(FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi
  const entries: Array<{ pos: number; alias: string }> = []
  let m: RegExpExecArray | null
  while ((m = joinRe.exec(sql)) !== null) {
    const rawAlias = m[3]
    if (!rawAlias || SQL_KW.test(rawAlias)) continue
    entries.push({ pos: m.index + m[0].length - rawAlias.length, alias: rawAlias })
  }
  const used     = new Set(entries.map(e => e.alias.toLowerCase()))
  const rewrites: Array<{ pos: number; oldAlias: string; newAlias: string }> = []
  const seenCount = new Map<string, number>()
  for (const { pos, alias } of entries) {
    const key   = alias.toLowerCase()
    const count = seenCount.get(key) ?? 0
    seenCount.set(key, count + 1)
    if (count > 0) {
      let n = count + 1
      let newAlias = alias + n
      while (used.has(newAlias.toLowerCase())) { n++; newAlias = alias + n }
      used.add(newAlias.toLowerCase())
      rewrites.push({ pos, oldAlias: alias, newAlias })
    }
  }
  if (!rewrites.length) return sql
  let result = sql, offset = 0
  for (const { pos, oldAlias, newAlias } of rewrites) {
    const p = pos + offset
    result  = result.slice(0, p) + newAlias + result.slice(p + oldAlias.length)
    offset += newAlias.length - oldAlias.length
    const afterDecl = result.slice(p + newAlias.length)
    const fixed     = afterDecl.replace(new RegExp(`\\b${oldAlias}\\.`, 'g'), `${newAlias}.`)
    result  = result.slice(0, p + newAlias.length) + fixed
    offset += fixed.length - afterDecl.length
  }
  return result
}

export async function checkOllamaHealth(): Promise<{ online: boolean; models?: string[] }> {
  try {
    if (!GROQ_API_KEY) return { online: false }
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { online: false }
    const data = await res.json()
    return { online: true, models: data.data?.map((m: any) => m.id) }
  } catch {
    return { online: false }
  }
}