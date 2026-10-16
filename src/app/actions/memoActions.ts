'use server'

import { v4 as uuidv4, validate as uuidValidate, version as uuidVersion } from 'uuid'
import { Memo, MemoFormData } from '@/types/memo'
import { getSupabaseServer } from '@/utils/supabaseServer'
import { generateSummary, SummaryResult } from '@/utils/gemini'

const TABLE = 'memos'
const MAX_TITLE_LENGTH = 200
const MAX_CONTENT_LENGTH = 50000
const MAX_TAGS = 50
const MAX_TAG_LENGTH = 50

interface MemoRow {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  summary: string | null
  created_at: string
  updated_at: string
}

const toMemo = (row: MemoRow): Memo => ({
  id: row.id,
  title: row.title,
  content: row.content,
  category: row.category,
  tags: row.tags ?? [],
  summary: row.summary,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
})

const assertId = (id: unknown): string => {
  if (typeof id !== 'string' || !uuidValidate(id) || uuidVersion(id) !== 4) {
    throw new Error('잘못된 메모 ID입니다.')
  }
  return id
}

// 클라이언트 입력을 신뢰하지 않고 서버에서 다시 검증
const assertFormData = (data: MemoFormData): MemoFormData => {
  if (
    !data ||
    typeof data.title !== 'string' ||
    typeof data.content !== 'string' ||
    typeof data.category !== 'string' ||
    !Array.isArray(data.tags) ||
    data.tags.some(tag => typeof tag !== 'string')
  ) {
    throw new Error('잘못된 메모 데이터입니다.')
  }
  const title = data.title.trim()
  if (!title || title.length > MAX_TITLE_LENGTH) {
    throw new Error('제목이 올바르지 않습니다.')
  }
  if (!data.content.trim() || data.content.length > MAX_CONTENT_LENGTH) {
    throw new Error('내용이 올바르지 않습니다.')
  }
  if (data.tags.length > MAX_TAGS) {
    throw new Error('태그가 너무 많습니다.')
  }
  return {
    title,
    content: data.content,
    category: data.category.trim() || 'other',
    tags: data.tags.map(tag => tag.trim().slice(0, MAX_TAG_LENGTH)).filter(Boolean),
  }
}

export async function fetchMemos(): Promise<Memo[]> {
  const { data, error } = await getSupabaseServer()
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`메모 조회 실패: ${error.message}`)
  return (data as MemoRow[]).map(toMemo)
}

export async function createMemoAction(formData: MemoFormData): Promise<Memo> {
  const valid = assertFormData(formData)
  const { data, error } = await getSupabaseServer()
    .from(TABLE)
    .insert({ id: uuidv4(), ...valid })
    .select('*')
    .single()
  if (error) throw new Error(`메모 생성 실패: ${error.message}`)
  return toMemo(data as MemoRow)
}

export async function updateMemoAction(
  id: string,
  formData: MemoFormData
): Promise<Memo> {
  const memoId = assertId(id)
  const valid = assertFormData(formData)
  const supabase = getSupabaseServer()

  const { data: existing, error: findError } = await supabase
    .from(TABLE)
    .select('content')
    .eq('id', memoId)
    .single()
  if (findError) throw new Error(`메모 조회 실패: ${findError.message}`)

  // 본문이 바뀌면 이전 요약은 더 이상 유효하지 않으므로 초기화
  const contentChanged = existing.content !== valid.content
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      ...valid,
      ...(contentChanged ? { summary: null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', memoId)
    .select('*')
    .single()
  if (error) throw new Error(`메모 수정 실패: ${error.message}`)
  return toMemo(data as MemoRow)
}

export async function deleteMemoAction(id: string): Promise<void> {
  const memoId = assertId(id)
  const { error } = await getSupabaseServer()
    .from(TABLE)
    .delete()
    .eq('id', memoId)
  if (error) throw new Error(`메모 삭제 실패: ${error.message}`)
}

// 요약 생성 후 DB에 저장. 실패는 예외 대신 사용자용 메시지로 반환
export async function summarizeMemoAction(id: string): Promise<SummaryResult> {
  let memoId: string
  try {
    memoId = assertId(id)
  } catch {
    return { error: '잘못된 요청입니다.' }
  }

  const supabase = getSupabaseServer()
  const { data, error } = await supabase
    .from(TABLE)
    .select('content')
    .eq('id', memoId)
    .single()
  if (error || !data) {
    console.error('요약 대상 메모 조회 실패:', error)
    return { error: '메모를 찾을 수 없습니다.' }
  }

  const result = await generateSummary(data.content)
  if ('error' in result) return result

  const { error: saveError } = await supabase
    .from(TABLE)
    .update({ summary: result.summary })
    .eq('id', memoId)
  if (saveError) {
    console.error('요약 저장 실패:', saveError)
    return { error: '요약을 저장하지 못했습니다. 다시 시도해주세요.' }
  }
  return result
}
