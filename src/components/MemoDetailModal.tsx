'use client'

import { useEffect } from 'react'
import { Memo, MEMO_CATEGORIES } from '@/types/memo'
import { useSummarize } from '@/hooks/useSummarize'
import MarkdownViewer from './MarkdownViewer'

interface MemoDetailModalProps {
  memo: Memo | null
  onClose: () => void
  onEdit: (memo: Memo) => void
  onDelete: (id: string) => void
  onSummarySaved?: (memoId: string, summary: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  personal: 'bg-blue-100 text-blue-800',
  work: 'bg-green-100 text-green-800',
  study: 'bg-purple-100 text-purple-800',
  idea: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-800',
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function MemoDetailModal({
  memo,
  onClose,
  onEdit,
  onDelete,
  onSummarySaved,
}: MemoDetailModalProps) {
  const isOpen = memo !== null
  const {
    summary: newSummary,
    loading,
    error,
    summarize,
    reset,
  } = useSummarize(onSummarySaved)
  // 방금 만든 요약이 있으면 우선, 없으면 DB에 저장된 요약 표시
  const summary = newSummary || memo?.summary || ''
  const memoId = memo?.id

  // 모달은 항상 마운트되어 있으므로 메모가 바뀌거나 닫힐 때 요약 상태 초기화
  useEffect(() => {
    reset()
  }, [memoId, reset])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!memo) return null

  const handleDelete = () => {
    if (window.confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      onDelete(memo.id)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      data-testid="memo-detail-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="memo-detail-title"
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        data-testid="memo-detail-modal"
      >
        {/* 헤더 */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2
              id="memo-detail-title"
              className="text-xl font-bold text-gray-900 mb-2 break-words"
            >
              {memo.title}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${CATEGORY_COLORS[memo.category] || CATEGORY_COLORS.other}`}
              >
                {MEMO_CATEGORIES[memo.category as keyof typeof MEMO_CATEGORIES] ||
                  memo.category}
              </span>
              <span className="text-xs text-gray-500">
                수정: {formatDate(memo.updatedAt)}
              </span>
              <span className="text-xs text-gray-500">
                작성: {formatDate(memo.createdAt)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="ml-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="memo-detail-close-btn"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 overflow-y-auto">
          {/* AI 요약 */}
          <div className="mb-4">
            <button
              onClick={() => summarize(memo.id)}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors"
              data-testid="memo-summarize-btn"
            >
              {loading ? '요약 중...' : summary ? '다시 요약' : '✨ AI 요약'}
            </button>
            {error && (
              <p
                role="alert"
                className="mt-2 text-sm text-red-600"
                data-testid="memo-summary-error"
              >
                {error}
              </p>
            )}
            {summary && (
              <div
                className="mt-3 p-4 bg-blue-50 border border-blue-100 rounded-lg"
                data-testid="memo-summary-result"
              >
                <MarkdownViewer content={summary} />
              </div>
            )}
          </div>

          <MarkdownViewer content={memo.content} />

          {memo.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-4">
              {memo.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={() => onEdit(memo)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            data-testid="memo-detail-edit-btn"
          >
            편집
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            data-testid="memo-detail-delete-btn"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
