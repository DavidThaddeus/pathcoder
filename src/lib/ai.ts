// Multi-provider AI client with an ordered fallback chain.
//
// Groq (LPU inference) is primary: fast (~2–4s) and reliable, with a generous
// free tier and native JSON mode. OpenRouter free models are the backup if Groq
// is unavailable. On any failure for an entry — network error, timeout, rate
// limit (429), server error, or output that fails validation — we advance to
// the next entry.

type Provider = 'groq' | 'openrouter'

interface ModelEntry {
  provider: Provider
  model: string
}

// Ordered most-capable/fastest first.
export const AI_MODELS: ModelEntry[] = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile' }, // primary: fast + capable
  { provider: 'groq', model: 'llama-3.1-8b-instant' },    // fastest fallback
  { provider: 'groq', model: 'openai/gpt-oss-120b' },     // stronger Groq option
  { provider: 'openrouter', model: 'openai/gpt-oss-120b:free' }, // off-Groq backup
  { provider: 'openrouter', model: 'openai/gpt-oss-20b:free' },
]

export interface AIResult {
  content: string
  model: string
}

interface CallParams {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  maxTokens?: number
  temperature?: number
  topP?: number
  timeoutMs?: number
  // Ask providers that support it (Groq) to return strict JSON.
  jsonMode?: boolean
  // Optional gate: a model's output is only accepted when this returns true.
  validate?: (content: string) => boolean
}

function providerConfig(provider: Provider) {
  if (provider === 'groq') {
    return {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY,
      headers: {} as Record<string, string>,
    }
  }
  return {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    key: process.env.OPENROUTER_API_KEY,
    headers: {
      'HTTP-Referer': 'https://pathcoder.app',
      'X-Title': 'PathCoder',
    } as Record<string, string>,
  }
}

export async function callAI({
  messages,
  maxTokens = 2048,
  temperature = 0.7,
  topP = 0.95,
  timeoutMs = 30000,
  jsonMode = false,
  validate,
}: CallParams): Promise<AIResult | null> {
  for (const entry of AI_MODELS) {
    const cfg = providerConfig(entry.provider)
    if (!cfg.key) continue // provider not configured — skip

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const body: Record<string, unknown> = {
        model: entry.model,
        messages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
      }
      // JSON mode is supported by Groq; skip it for OpenRouter free models
      // (they're inconsistent about it) and rely on the prompt + parser there.
      if (jsonMode && entry.provider === 'groq') {
        body.response_format = { type: 'json_object' }
      }

      const response = await fetch(cfg.url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.key}`,
          ...cfg.headers,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        console.warn(`[AI] ${entry.provider}:${entry.model} failed: HTTP ${response.status} — trying next`)
        continue
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (content && content.trim()) {
        if (validate && !validate(content)) {
          console.warn(`[AI] ${entry.provider}:${entry.model} output failed validation — trying next`)
          continue
        }
        console.log(`\n🤖 [AI] served by → ${entry.provider}:${entry.model}\n`)
        return { content, model: `${entry.provider}:${entry.model}` }
      }

      console.warn(`[AI] ${entry.provider}:${entry.model} returned empty content — trying next`)
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error'
      console.warn(`[AI] ${entry.provider}:${entry.model} errored (${reason}) — trying next`)
    } finally {
      clearTimeout(timeout)
    }
  }

  console.error('[AI] all providers/models in the fallback chain failed')
  return null
}
