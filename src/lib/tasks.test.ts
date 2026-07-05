import { describe, it, expect } from 'vitest'
import { moveTask, filterByTitle, rollback, groupByStatus } from './tasks'
import type { Task } from '../types'

const make = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  status: 'todo',
  priority: 'medium',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  version: 1,
  ...over,
})

describe('moveTask', () => {
  it('대상 태스크의 status 만 바꾸고 나머지는 그대로 둔다', () => {
    const tasks = [make('a'), make('b')]
    const next = moveTask(tasks, 'a', 'done')
    expect(next.find((t) => t.id === 'a')?.status).toBe('done')
    expect(next.find((t) => t.id === 'b')?.status).toBe('todo')
  })

  it('불변성을 지킨다 (원본 배열/객체를 변경하지 않는다)', () => {
    const tasks = [make('a')]
    const next = moveTask(tasks, 'a', 'done')
    expect(tasks[0].status).toBe('todo')
    expect(next).not.toBe(tasks)
  })
})

describe('filterByTitle', () => {
  it('대소문자 구분 없이 제목으로 필터링한다', () => {
    const tasks = [make('a', { title: 'Fix login bug' }), make('b', { title: 'Write docs' })]
    expect(filterByTitle(tasks, 'FIX')).toHaveLength(1)
  })

  it('빈 검색어면 전체를 반환한다', () => {
    const tasks = [make('a'), make('b')]
    expect(filterByTitle(tasks, '   ')).toHaveLength(2)
  })
})

describe('rollback', () => {
  it('실패한 태스크를 원래 상태로 되돌린다', () => {
    const original = make('a', { status: 'todo' })
    const tasks = [make('a', { status: 'done' }), make('b')]

    const result = rollback(tasks, original)

    expect(result.find((t) => t.id === 'a')?.status).toBe('todo')
  })

  it('롤백 대상 외 나머지는 건드리지 않는다', () => {
    const original = make('a', { status: 'todo' })
    const tasks = [make('a', { status: 'done' }), make('b', { status: 'in-progress' })]

    const result = rollback(tasks, original)

    expect(result.find((t) => t.id === 'b')?.status).toBe('in-progress')
  })
})

describe('groupByStatus', () => {
  it('각 태스크를 status에 맞는 그룹에 넣는다', () => {
    const tasks = [
      make('a', { status: 'todo' }),
      make('b', { status: 'in-progress' }),
      make('c', { status: 'done' }),
      make('d', { status: 'done' }),
    ]

    const result = groupByStatus(tasks)

    expect(result.todo).toHaveLength(1)
    expect(result['in-progress']).toHaveLength(1)
    expect(result.done).toHaveLength(2)
  })

  it('해당 status 태스크가 없으면 빈 배열을 반환한다', () => {
    const tasks = [make('a', { status: 'todo' })]

    const result = groupByStatus(tasks)

    expect(result['in-progress']).toHaveLength(0)
    expect(result.done).toHaveLength(0)
  })
})
