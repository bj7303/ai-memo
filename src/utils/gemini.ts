// 서버 전용: Gemini API 호출. 클라이언트 코드에서 import 금지

// 모델은 2027-05-07 폐기 예정이므로 변경하기 쉽게 상수로 분리
const GEMINI_MODEL = 'gemini-3.1-flash-lite'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const MIN_CONTENT_LENGTH = 30
const MAX_CONTENT_LENGTH = 20000
// 성공 응답도 10~20초 걸리는 경우가 있어 시도당 제한을 넉넉히 둠
const REQUEST_TIMEOUT_MS = 30000
const TOTAL_TIMEOUT_MS = 60000
// 모델 과부하(503) 등 일시 오류는 재시도
const RETRYABLE_STATUS = [429, 500, 503]
const MAX_ATTEMPTS = 6
const RETRY_DELAY_MS = 1000

const BUSY_MESSAGE =
  'AI 서버가 혼잡해 요약하지 못했습니다. 잠시 후 다시 시도해주세요.'
const TIMEOUT_MESSAGE =
  'AI 서버 응답이 너무 늦어 요약하지 못했습니다. 잠시 후 다시 시도해주세요.'
const FAILED_MESSAGE = '요약에 실패했습니다. 다시 시도해주세요.'

const SYSTEM_INSTRUCTION =
  '사용자가 보낸 메모를 한국어로 요약하라. 핵심 내용을 3~5개의 글머리표("- ")로만 출력하고, 서론이나 맺음말은 쓰지 않는다.'

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[]
    }
  }[]
}

export type SummaryResult = { summary: string } | { error: string }

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 일시 오류(503 등)와 타임아웃은 전체 대기 시간 한도 안에서 재시도
const callGemini = async (apiKey: string, content: string) => {
  const startedAt = Date.now()
  for (let attempt = 1; ; attempt++) {
    const remaining = TOTAL_TIMEOUT_MS - (Date.now() - startedAt)
    const isLastAttempt = attempt >= MAX_ATTEMPTS || remaining <= RETRY_DELAY_MS
    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: 'user', parts: [{ text: content }] }],
        }),
        signal: AbortSignal.timeout(
          Math.max(1000, Math.min(REQUEST_TIMEOUT_MS, remaining))
        ),
      })
      if (res.ok || !RETRYABLE_STATUS.includes(res.status) || isLastAttempt) {
        return res
      }
      console.error(`Gemini 일시 오류 ${res.status}, 재시도 ${attempt}`)
    } catch (error) {
      if (isLastAttempt) throw error
      console.error(`Gemini 요청 실패, 재시도 ${attempt}:`, error)
    }
    await sleep(RETRY_DELAY_MS)
  }
}

export const generateSummary = async (
  content: string
): Promise<SummaryResult> => {
  if (!content.trim()) {
    return { error: '요약할 내용이 없습니다.' }
  }
  if (content.trim().length < MIN_CONTENT_LENGTH) {
    return { error: '요약하기에는 내용이 너무 짧습니다.' }
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return {
      error: `내용이 너무 깁니다. ${MAX_CONTENT_LENGTH.toLocaleString()}자 이하의 메모만 요약할 수 있습니다.`,
    }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('GEMINI_API_KEY가 설정되어 있지 않습니다.')
    return { error: 'AI 요약 설정이 되어 있지 않습니다.' }
  }

  try {
    const res = await callGemini(apiKey, content)

    if (!res.ok) {
      console.error('Gemini API 오류:', res.status, await res.text())
      if (res.status === 429 || res.status === 503) {
        return { error: BUSY_MESSAGE }
      }
      return { error: FAILED_MESSAGE }
    }

    const data: GeminiResponse = await res.json()
    const summary = (data.candidates?.[0]?.content?.parts ?? [])
      .map(part => part.text ?? '')
      .join('')
      .trim()

    if (!summary) {
      console.error('Gemini 응답에 요약 텍스트가 없습니다.')
      return { error: FAILED_MESSAGE }
    }

    return { summary }
  } catch (error) {
    console.error('요약 요청 실패:', error)
    if (error instanceof Error && error.name === 'TimeoutError') {
      return { error: TIMEOUT_MESSAGE }
    }
    return { error: FAILED_MESSAGE }
  }
}
