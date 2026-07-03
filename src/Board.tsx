import { useEffect, useMemo, useState, useRef } from "react";
import type { Task, Status } from "./types";
import { getTasks, updateTask } from "./api/client";
import { Column } from "./components/Column";

const COLUMNS: { status: Status; title: string }[] = [
  { status: "todo", title: "To Do" },
  { status: "in-progress", title: "In Progress" },
  { status: "done", title: "Done" },
];
type LoadState = "loading" | "error" | "success";

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  // 리렌더링 없이 항상 최신 tasks를 읽기 위한 ref
  const tasksRef = useRef<Task[]>([]);
  // 서버가 마지막으로 성공 확인한 task 상태 (실패 시 여기로 롤백)
  const savedTasksRef = useRef<Map<string, Task>>(new Map());
  // task별 요청 줄세우기
  const queueRef = useRef<Map<string, Promise<void>>>(new Map());

  tasksRef.current = tasks;

  useEffect(() => {
    // 순진한 초기 로드: 로딩만 처리합니다.
    // TODO(P1): 에러 상태 + 재시도, 빈 상태 처리를 구현하세요.
    loadingTask();
  }, []);

  const loadingTask = () => {
    setLoadState("loading");
    getTasks()
      .then((data) => {
        setTasks(data);
        data.forEach((task) => savedTasksRef.current.set(task.id, task));
        setLoadState("success");
      })
      .catch(() => {
        setLoadState("error");
      });
  };

  // ⚠️ 서버에 저장하지 않고 로컬 상태만 바꾸는 "순진한" 이동입니다.
  // TODO(P1): 낙관적 업데이트 + 실패 시 롤백 + 경쟁 상태 처리를 구현하세요.
  //   - updateTask(id, { status, version }) 로 서버에 반영
  //   - 실패(15%)하면 이전 상태로 되돌리고 사용자에게 알림
  //   - 같은 카드를 빠르게 연속 이동해도 최종 상태가 서버와 일치하도록
  const moveTask = (id: string, status: Status) => {
    // 1. 화면 즉시 변경 + tasksRef 동시 업데이트
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, status } : t));
      tasksRef.current = updated;
      return updated;
    });

    // 2. 이전 요청 가져오기 (없으면 즉시 실행)
    const prevRequest = queueRef.current.get(id) ?? Promise.resolve();

    // 3. 이전 요청 끝나면 실행
    const currRequest = prevRequest.then(() => {
      // 큐 실행 시점의 최신 version 읽기
      const currentTask = tasksRef.current.find((t) => t.id === id);
      if (!currentTask) return;

      return updateTask(id, { status, version: currentTask.version })
        .then((serverTask) => {
          // 성공: 서버 확인 상태 저장 + version 동기화
          savedTasksRef.current.set(id, serverTask);
          tasksRef.current = tasksRef.current.map((t) =>
            t.id === id ? serverTask : t,
          );
          setTasks(tasksRef.current);
        })
        .catch(() => {
          // 실패: 마지막 서버 확인 상태로 롤백
          const rollbackTask = savedTasksRef.current.get(id);
          if (rollbackTask) {
            tasksRef.current = tasksRef.current.map((t) =>
              t.id === id ? rollbackTask : t,
            );
            setTasks(tasksRef.current);
          }
          alert("이동에 실패하였습니다. 이전 상태로 되돌립니다.");
        });
    });

    // 4. 현재 요청 큐에 저장
    queueRef.current.set(
      id,
      currRequest.catch(() => {}),
    );
  };

  const byStatus = useMemo(() => {
    const map: Record<Status, Task[]> = {
      todo: [],
      "in-progress": [],
      done: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  if (loadState == "loading") return <p className="hint">불러오는 중…</p>;
  if (loadState == "error")
    return (
      <div>
        <p className="hint">불러오기에 실패하였습니다.</p>
        <button onClick={() => loadingTask()}>재시도</button>
      </div>
    );
  if (tasks.length === 0) return <p>태스크가 없습니다.</p>;

  return (
    <div className="board">
      {COLUMNS.map((col) => (
        <Column
          key={col.status}
          title={col.title}
          status={col.status}
          tasks={byStatus[col.status]}
          onMove={moveTask}
        />
      ))}
    </div>
  );
}
