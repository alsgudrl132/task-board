import { useState } from "react";
import type { Task, Status, Priority } from "../types";

interface Props {
  mode: "create" | "edit";
  task?: Task;
  onSubmit: (data: Partial<Task>) => void;
  onClose: () => void;
}

export function TaskModal({ mode, task, onSubmit, onClose }: Props) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [status, setStatus] = useState<Status>(task?.status ?? "todo");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim() || undefined, priority, status });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">
          {mode === "create" ? "태스크 추가" : "태스크 수정"}
        </h2>
        <form onSubmit={handleSubmit} className="modal-form">
          <label className="modal-label">
            제목 <span className="required">*</span>
            <input
              className="modal-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              autoFocus
            />
          </label>

          <label className="modal-label">
            우선순위 <span className="required">*</span>
            <select
              className="modal-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>

          {mode === "edit" && (
            <label className="modal-label">
              상태
              <select
                className="modal-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </label>
          )}

          <label className="modal-label">
            설명
            <textarea
              className="modal-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="설명을 입력하세요 (선택)"
              rows={3}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
              {mode === "create" ? "추가" : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
