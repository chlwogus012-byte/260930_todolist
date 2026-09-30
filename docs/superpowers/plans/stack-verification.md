# 스택 검증 기록 (2026-09-30)

| 항목 | 출처 1: 공식 문서 | 출처 2: npm 레지스트리 | 출처 3: WebSearch | 결과 |
|---|---|---|---|---|
| supabase-js v2 `createClient`, `signInWithPassword`, `signUp` | supabase.com/docs/reference/javascript | 2.117.2 | 일치 | 계획 코드 유효 |
| `onAuthStateChange` 반환 `{data:{subscription}}`, `unsubscribe()`, 첫 이벤트 `INITIAL_SESSION`, 콜백은 async로 쓰지 말 것 | 공식 레퍼런스 | - | 일치 | 계획 코드 유효(콜백 동기) |
| RLS `(select auth.uid())`, `to authenticated` 명시, 필터 컬럼 인덱스 | supabase.com/docs/guides/database/postgres/row-level-security | - | 일치 | 계획 SQL 유효. 공식 예시대로 `revoke/grant` 추가 |
| 무료 플랜: 7일 비활동 시 프로젝트 일시정지, 데이터 유지 | - | - | 다수 글 일치(jetadmin, automationatlas 등) | 사용자에게 안내 필요 |
| 패키지 버전 | - | vite 8.3.1, vitest 5.0.2, vite-plugin-pwa 1.3.0(vite ^8 지원), react 19.3.0, @vitejs/plugin-react 6.1.1(vite ^8 요구) | - | `npm create vite`가 주는 조합을 그대로 사용 |

- Context7은 이 세션에서 사용할 수 없었다(도구 목록에 없음). 대신 공식 문서 직접 조회 + npm 레지스트리 + WebSearch 세 출처로 교차 확인했다.
- 충돌하는 출처는 없었다.
- 계획과 달라지는 점: RLS 마이그레이션에 `revoke all ... from anon, authenticated; grant select, insert, update, delete ... to authenticated;` 추가.
- Supabase 유지 결정: 이 앱에 적합. 단 무료 플랜은 7일간 접속이 없으면 일시정지(대시보드에서 복구 가능, 데이터는 삭제되지 않음).
