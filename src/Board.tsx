import { useEffect, useMemo, useState, useRef } from "react";
import type { Task, Status } from "./types";
import { createTask, deleteTask, getTasks, updateTask } from "./api/client";
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
          // status는 현재 낙관적 상태 유지, version만 서버 값으로 동기화
          tasksRef.current = tasksRef.current.map((t) =>
            t.id === id ? { ...t, version: serverTask.version } : t,
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

  const handleCreate = (data: Partial<Task>) => {
    setModal({ type: "none" });

    // 1. 임시 ID로 화면에 먼저 추가
    const tempId = `temp-${Date.now()}`;
    const tempTask: Task = {
      id: tempId,
      status: "todo",
      version: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: data.title!,
      priority: data.priority ?? "medium",
    };
    tasksRef.current = [tempTask, ...tasksRef.current];
    setTasks(tasksRef.current);

    // 2. 서버 요청
    createTask(data)
      .then((serverTask) => {
        // 성공: 임시 항목을 서버 데이터로 교체
        tasksRef.current = tasksRef.current.map((t) =>
          t.id === tempId ? serverTask : t,
        );
        setTasks(tasksRef.current);
      })
      .catch(() => {
        // 3. 실패: 임시 항목 제거
        tasksRef.current = tasksRef.current.filter((t) => t.id !== tempId);
        setTasks(tasksRef.current);
        alert("추가에 실패했습니다.");
      });
  };

  const handleEdit = (data: Partial<Task>) => {
    if (modal.type !== "edit") return;
    const target = modal.task; // 원본 태스크 먼저 저장
    setModal({ type: "none" });

    // 낙관적 업데이트: 교체
    tasksRef.current = tasksRef.current.map((t) =>
      t.id === target.id ? { ...target, ...data } : t,
    );
    setTasks(tasksRef.current);

    updateTask(target.id, { ...data, version: target.version })
      .then((serverTask) => {
        tasksRef.current = tasksRef.current.map((t) =>
          t.id === serverTask.id ? serverTask : t,
        );
        setTasks(tasksRef.current);
      })
      .catch(() => {
        // 실패: 원본으로 롤백
        tasksRef.current = tasksRef.current.map((t) =>
          t.id === target.id ? target : t,
        );
        setTasks(tasksRef.current);
        alert("수정에 실패했습니다.");
      });
  };

  const handleDelete = () => {
    if (modal.type !== "delete") return;
    const target = modal.task;
    setModal({ type: "none" });

    tasksRef.current = tasksRef.current.filter((t) => t.id !== target.id);
    setTasks(tasksRef.current);

    deleteTask(target.id)
      .then(() => {
        alert("삭제되었습니다.");
      })
      .catch(() => {
        tasksRef.current = [target, ...tasksRef.current];
        setTasks(tasksRef.current);
        alert("삭제에 실패했습니다.");
      });
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
