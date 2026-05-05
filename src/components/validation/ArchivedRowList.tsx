"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CardActionMenu } from "./CardActionMenu";

export type ArchivedRow = {
  id: string;
  title: string;
  who: string;
  archivedAt: string | null;
  solutionCount: number;
  hypothesisCount: number;
  fitCount: number;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function ArchivedRowList({ items }: { items: ArchivedRow[] }) {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<ArchivedRow | null>(null);

  async function restore(id: string) {
    const res = await fetch(`/api/problems/${id}/restore`, { method: "POST" });
    if (res.ok) router.refresh();
  }

  async function confirmDelete(id: string): Promise<boolean> {
    const res = await fetch(`/api/problems/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
      return true;
    }
    return false;
  }

  return (
    <>
      <div className="space-y-4">
        {items.map((row) => (
          <Card key={row.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-base text-foreground line-clamp-2">{row.title}</p>
                <p className="text-xs text-muted mt-1 line-clamp-1">{row.who}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-subtle">아카이브 {timeAgo(row.archivedAt)}</span>
                <CardActionMenu
                  variant="archived"
                  onRestore={() => restore(row.id)}
                  onDelete={() => setPendingDelete(row)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-tertiary border-t border-border pt-2">
              <span>가설 {row.hypothesisCount}</span>
              <span className="text-subtle">·</span>
              <span>솔루션 {row.solutionCount}</span>
              <span className="text-subtle">·</span>
              <span>Fit 평가 {row.fitCount}</span>
            </div>
          </Card>
        ))}
      </div>

      {pendingDelete && (
        <DeleteConfirmModal
          row={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={async () => {
            const ok = await confirmDelete(pendingDelete.id);
            if (ok) setPendingDelete(null);
            return ok;
          }}
        />
      )}
    </>
  );
}

function DeleteConfirmModal({
  row,
  onCancel,
  onConfirm,
}: {
  row: ArchivedRow;
  onCancel: () => void;
  onConfirm: () => Promise<boolean>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setPending(true);
    setError(null);
    try {
      const ok = await onConfirm();
      if (!ok) setError("삭제 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-start gap-3 p-5 border-b border-border">
          <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">영구 삭제</h2>
            <p className="text-xs text-muted mt-1">
              이 작업은 되돌릴 수 없습니다. 다시 생각해 주세요.
            </p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-foreground line-clamp-2 font-medium">{row.title}</p>
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 space-y-1">
            <p className="font-medium">함께 삭제되는 항목</p>
            <ul className="list-disc list-inside space-y-0.5 marker:text-red-400">
              <li>가설 {row.hypothesisCount}개 (검증 findings 포함)</li>
              <li>솔루션 가설 {row.solutionCount}개 (1-pager · 패널 검토 포함)</li>
              <li>Fit 평가 {row.fitCount}개</li>
            </ul>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-wash/50">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="text-sm rounded-md border border-border bg-surface px-3 py-1.5 text-tertiary hover:bg-wash disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={go}
            disabled={pending}
            className="flex items-center gap-1.5 text-sm rounded-md bg-red-600 px-3 py-1.5 text-white hover:bg-red-500 disabled:opacity-60"
          >
            {pending && <Loader2 size={12} className="animate-spin" />}
            {pending ? "삭제 중..." : "영구 삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}
