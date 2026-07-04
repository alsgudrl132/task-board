import { useEffect, useMemo, useState, useRef } from "react";
import type { Task, Status } from "./types";
import { getTasks, updateTask } from "./api/client";
import { Column } from "./components/Column";
import { TaskModal } from "./components/TaskModal";
import { DeleteDialog } from "./components/DeleteDialog";

const COLUMNS: { status: Status; title: string }[] = [
  { status: "todo", title: "To Do" },
  { status: "in-progress", title: "In Progress" },
  { status: "done", title: "Done" },
];
type LoadState = "loading" | "error" | "success";

type ModalState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; task: Task }
  | { type: "delete"; task: Task };

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  // 리렌더링 없이 항상 최신 tasks를 읽기 위한 ref
  const tasksRef = useRef<Task[]>([]);
  // 서버가 마지막으로 성공 확인한 task 상태 (실패 시 여기로 롤백)
  const savedTasksRef = useRef<Map<string, Task>>(new Map());
  // task별 요청 줄세우기
  const queueRef = useRef<Map<string, Promise<void>>>(new Map());

  tasksRef.current = tasks;

  useEffect(() => {
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
      const currentTask = tasksRef.current.find((t) => t.id === id);
      if (!currentTask) return;

      return updateTask(id, { status, version: currentTask.version })
        .then((serverTask) => {
          savedTasksRef.current.set(id, serverTask);
          tasksRef.current = tasksRef.current.map((t) =>
            t.id === id ? serverTask : t,
          );
          setTasks(tasksRef.current);
        })
        .catch(() => {
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

  // TODO: createTask API 호출 + 낙관적 업데이트 구현
  const handleCreate = (data: Partial<Task>) => {
    setModal({ type: "none" });
  };

  // TODO: updateTask API 호출 + 낙관적 업데이트 구현
  const handleEdit = (data: Partial<Task>) => {
    setModal({ type: "none" });
  };

  // TODO: deleteTask API 호출 + 낙관적 삭제 구현
  const handleDelete = () => {
    setModal({ type: "none" });
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
    <>
      <div className="board-toolbar">
        <button
          className="btn btn-primary"
          onClick={() => setModal({ type: "create" })}
        >
          + 태스크 추가
        </button>
      </div>
      <div className="board">
        {COLUMNS.map((col) => (
          <Column
            key={col.status}
            title={col.title}
            status={col.status}
            tasks={byStatus[col.status]}
            onMove={moveTask}
            onEdit={(task) => setModal({ type: "edit", task })}
            onDelete={(task) => setModal({ type: "delete", task })}
          />
        ))}
      </div>

      {modal.type === "create" && (
        <TaskModal
          mode="create"
          onSubmit={handleCreate}
          onClose={() => setModal({ type: "none" })}
        />
      )}
      {modal.type === "edit" && (
        <TaskModal
          mode="edit"
          task={modal.task}
          onSubmit={handleEdit}
          onClose={() => setModal({ type: "none" })}
        />
      )}
      {modal.type === "delete" && (
        <DeleteDialog
          task={modal.task}
          onConfirm={handleDelete}
          onCancel={() => setModal({ type: "none" })}
        />
      )}
    </>
  );
}
