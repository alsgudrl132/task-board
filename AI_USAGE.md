# AI 도구 활용 (AI_USAGE)

## 1. 사용한 도구

- Claude (Anthropic) — Claude Code CLI

## 2. 주로 어디에 썼나

| 작업                                  | 활용 방식                          |
| ------------------------------------- | ---------------------------------- |
| 낙관적 업데이트 구조 설계             | 접근법 질문 후 직접 구현           |
| 경쟁 상태 처리 (Promise 큐)           | 개념 설명 요청 후 직접 구현        |
| 가상 스크롤 (@tanstack/react-virtual) | 설치 방법 및 기본 사용법 안내      |
| CRUD 모달 UI 퍼블리싱                 | 컴포넌트 구조 설계 및 CSS 작성     |
| 유닛 테스트 작성                      | 테스트 개념 설명 후 일부 직접 작성 |

## 3. AI 답을 검증·거부·수정한 사례

**사례 1: 연속 이동 시 화면 깜빡임 버그**

AI가 작성한 `moveTask`의 `.then()` 콜백에서 서버 응답(`serverTask`)으로 task를 통째로 교체했다. 연속 이동 시(todo→in-progress→todo) 첫 번째 응답이 오면 이미 낙관적으로 todo로 돌아온 화면이 in-progress로 다시 덮어써지는 깜빡임이 발생했다. AI는 이 문제를 처음에 발견하지 못했고, 직접 브라우저에서 확인한 뒤 지적했다. 수정 방향을 논의해 `serverTask`로 전체 교체 대신 `version`만 동기화하는 방식으로 고쳤다.

**사례 2: handleEdit에서 404 에러**

AI가 `handleEdit` 구현 예시에서 `data.id`를 사용했는데, `TaskModal`이 submit할 때 id를 넘기지 않아 `data.id`가 undefined였다. 결과적으로 `/api/tasks/undefined`로 요청이 가서 404가 발생했다. 에러 메시지를 보고 직접 원인을 파악한 뒤 AI에게 알렸고, `modal.task`에서 `target`으로 원본 task를 저장한 뒤 `target.id`와 `target.version`을 사용하는 방식으로 수정했다.

**사례 3: filter 함수 작성 오류**

`handleDelete`에서 `tasksRef.current.filter(...)` 결과를 변수에 저장하지 않고 그냥 호출만 했다. 화면에 삭제가 반영되지 않아서 확인해보니 filter 결과를 `tasksRef.current`에 재할당하지 않은 것이었다. AI가 설명한 패턴을 이해하지 못하고 구현한 오류였고, 직접 디버깅해서 찾아냈다.

## 4. 스스로 판단해서 결정한 부분

- **삭제 성공 alert 추가 여부**: AI는 낙관적 삭제라 성공 alert가 필요 없다고 했지만, 사용자 피드백 차원에서 일단 추가했다. 과제 요구사항에 명시되지 않은 판단이었다.
- **수정/삭제 버튼 항상 표시 vs hover 표시**: 처음엔 hover 시에만 버튼을 보여주려 했으나 가상 스크롤의 z-index 구조상 버튼이 가려지는 문제가 있었다. AI와 함께 CSS `:has()` 선택자로 wrapper의 z-index를 올리는 방식으로 해결했다.
- **create에서 임시 ID 사용 여부**: AI가 낙관적 create를 위해 임시 ID 방식을 제안했는데, create는 사용자가 폼 제출 직후라 서버 응답을 기다려도 UX상 문제없다고 판단해 temp 방식의 이유를 먼저 이해한 뒤 구현 방향을 결정했다.
