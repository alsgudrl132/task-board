import type { Task } from "../types";

interface Props {
  task: Task;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteDialog({ task, onConfirm, onCancel }: Props) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">태스크 삭제</h2>
        <p className="dialog-message">
          <strong>{task.title}</strong>을(를) 삭제하시겠습니까?
          <br />
          이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            취소
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
