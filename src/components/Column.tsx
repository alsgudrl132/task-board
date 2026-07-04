import { useRef } from "react";
import type { Task, Status } from "../types";
import { Card } from "./Card";
import { useVirtualizer } from "@tanstack/react-virtual";
interface Props {
  title: string;
  status: Status;
  tasks: Task[];
  onMove: (id: string, status: Status) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function Column({
  title,
  status,
  tasks,
  onMove,
  onEdit,
  onDelete,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 120,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  return (
    <section
      className="column"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData("text/plain");
        if (id) onMove(id, status);
      }}
    >
      <h2 className="column-title">
        {title} <span className="count">{tasks.length}</span>
      </h2>
      <div className="column-body" ref={scrollRef}>
        {/* ⚠️ 5,000개를 그대로 렌더합니다. 대량 데이터 성능 최적화는 당신의 몫입니다. */}
        <div
          style={{ height: virtualizer.getTotalSize(), position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="virtual-item"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
                paddingBottom: "8px",
              }}
            >
              <Card
                task={tasks[virtualItem.index]}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
