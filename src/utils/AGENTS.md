# Utils - AI Agent 지침서

## 모듈 역할

순수 유틸리티 함수 및 헬퍼 집합. 비즈니스 로직과 독립적인 재사용 가능한 기능을 제공한다.

## 의존성 관계

- `@/types/memo` — Memo 타입

## 유틸리티 목록

| 파일 | 역할 |
|------|------|
| `supabaseServer.ts` | 서버 전용 Supabase 클라이언트 (`getSupabaseServer()`, service role key, 싱글턴) |
| `gemini.ts` | 서버 전용 Gemini 요약 호출 (`generateSummary(content)`, 검증·재시도·타임아웃 포함) |

## 서버 전용 유틸 규칙

- `supabaseServer.ts`, `gemini.ts`는 서버 액션에서만 import (클라이언트 컴포넌트·훅에서 import 금지)
- 필요한 환경변수: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` (`.env.local`, 이름만 문서화)
- DB 테이블 `memos`는 snake_case 컬럼(`created_at`, `updated_at`, `summary`)을 쓰며, `Memo` 타입(camelCase)으로의 변환은 `memoActions.ts`의 `toMemo`가 담당

## Implementation Patterns

### SSR 안전한 브라우저 API 접근

```typescript
export const browserUtil = {
  doSomething: (): ReturnType => {
    // SSR 환경 체크 필수
    if (typeof window === 'undefined') return defaultValue

    try {
      // 브라우저 API 사용
      return window.someApi()
    } catch (error) {
      console.error('Error:', error)
      return defaultValue
    }
  },
}
```

### 새 유틸리티 파일 작성 템플릿

```typescript
// 타입 import
import { SomeType } from '@/types/someType'

// 상수 정의
const STORAGE_KEY = 'app-key'

// 객체 형태로 관련 함수 그룹화
export const utilName = {
  method1: (param: ParamType): ReturnType => {
    // 구현
  },

  method2: (param: ParamType): ReturnType => {
    // 구현
  },
}
```

## Local Golden Rules

### Do's

- 모든 유틸리티는 순수 함수로 작성 (사이드 이펙트 최소화)
- SSR 환경 체크는 함수 최상단에서 수행
- 에러 발생 시 적절한 기본값 반환
- JSON 파싱/직렬화 시 try-catch 필수

### Don'ts

- React 훅 사용 금지 (유틸리티는 훅이 아님)
- 전역 상태 변경 금지
- 직접 DOM 조작 금지 (React에 위임)
- 비동기 함수에서 에러 무시 금지

## 테스트 고려사항

유틸리티 함수는 단위 테스트하기 용이함:
- 순수 함수는 입력 -> 출력 테스트
- `gemini.ts`는 `fetch`, `supabaseServer.ts`는 환경변수·Supabase 클라이언트 모킹 필요
