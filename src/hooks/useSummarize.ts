'use client'

import { useState, useCallback, useRef } from 'react'
import { summarizeMemoAction } from '@/app/actions/memoActions'

const DEFAULT_ERROR_MESSAGE = '요약에 실패했습니다. 다시 시도해주세요.'

// onSaved: 요약이 DB에 저장된 뒤 호출 (목록 상태 동기화용)
export const useSummarize = (
  onSaved?: (memoId: string, summary: string) => void
) => {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // 서버 액션은 취소할 수 없으므로, 요청 토큰으로 오래된 응답을 무시
  const requestRef = useRef<symbol | null>(null)

  const reset = useCallback(() => {
    requestRef.current = null
    setSummary('')
    setError('')
    setLoading(false)
  }, [])

  const summarize = useCallback(
    async (memoId: string) => {
      if (requestRef.current) return

      const token = Symbol('summarize')
      requestRef.current = token
      setLoading(true)
      setError('')

      try {
        const result = await summarizeMemoAction(memoId)
        if (requestRef.current !== token) return

        if ('error' in result) {
          setError(result.error || DEFAULT_ERROR_MESSAGE)
          return
        }
        setSummary(result.summary)
        onSaved?.(memoId, result.summary)
      } catch (e) {
        if (requestRef.current !== token) return
        console.error('요약 요청 실패:', e)
        setError(DEFAULT_ERROR_MESSAGE)
      } finally {
        if (requestRef.current === token) {
          requestRef.current = null
          setLoading(false)
        }
      }
    },
    [onSaved]
  )

  return { summary, loading, error, summarize, reset }
}
