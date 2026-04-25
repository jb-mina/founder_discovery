"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Invite = {
  id: string;
  email: string;
  status: "pending" | "approved" | "rejected" | "revoked";
  notes: string;
  code: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  revokedAt: string | null;
  emailSentAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

const STATUS_FILTERS = [
  { key: "all", label: "전체" },
  { key: "pending", label: "검토 대기" },
  { key: "approved", label: "승인됨" },
  { key: "revoked", label: "취소됨" },
  { key: "rejected", label: "거절" },
] as const;

const STATUS_VARIANTS: Record<
  Invite["status"],
  "default" | "violet" | "green" | "amber" | "red" | "blue"
> = {
  pending: "amber",
  approved: "green",
  revoked: "red",
  rejected: "default",
};

const STATUS_LABELS: Record<Invite["status"], string> = {
  pending: "검토 대기",
  approved: "승인됨",
  revoked: "취소됨",
  rejected: "거절",
};

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]["key"]>("all");
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/invites");
    if (res.ok) setInvites(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  async function act(id: string, action: "approve" | "reject" | "revoke", reason?: string) {
    setActingOn(id);
    await fetch(`/api/admin/invites/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reason ? { reason } : {}),
    });
    await fetchInvites();
    setActingOn(null);
  }

  const filtered = filter === "all" ? invites : invites.filter((i) => i.status === filter);
  const counts = STATUS_FILTERS.reduce<Record<string, number>>((acc, f) => {
    acc[f.key] = f.key === "all" ? invites.length : invites.filter((i) => i.status === f.key).length;
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Invite Requests</h1>
          <p className="text-sm text-muted mt-1">
            랜딩 페이지에서 제출된 초대 신청. 승인 시 코드 발급 + 이메일 발송.
          </p>
        </div>
        <button
          onClick={fetchInvites}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs rounded-lg border border-border bg-surface hover:bg-canvas px-3 py-2 text-tertiary disabled:opacity-40"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          새로고침
        </button>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0 ${
              filter === f.key
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-muted hover:text-secondary"
            }`}
          >
            {f.label}
            {(counts[f.key] ?? 0) > 0 && (
              <span
                className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                  filter === f.key ? "bg-violet-100 text-violet-700" : "bg-wash text-tertiary"
                }`}
              >
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && filtered.length === 0 ? (
        <div className="text-center py-16 text-subtle">
          <Loader2 size={20} className="mx-auto animate-spin mb-2" />
          <p className="text-sm">로딩 중...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-subtle">
          <p className="text-sm">해당 상태의 신청이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((invite) => (
            <InviteRow
              key={invite.id}
              invite={invite}
              onAct={(action, reason) => act(invite.id, action, reason)}
              acting={actingOn === invite.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InviteRow({
  invite,
  onAct,
  acting,
}: {
  invite: Invite;
  onAct: (action: "approve" | "reject" | "revoke", reason?: string) => void;
  acting: boolean;
}) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant={STATUS_VARIANTS[invite.status]}>{STATUS_LABELS[invite.status]}</Badge>
            <p className="text-sm font-medium text-foreground">{invite.email}</p>
          </div>
          <p className="text-xs text-muted">
            요청 {new Date(invite.createdAt).toLocaleString("ko-KR")}
            {invite.code && (
              <>
                {" · "}
                코드 <span className="font-mono text-violet-600">{invite.code}</span>
              </>
            )}
            {invite.lastUsedAt && (
              <>
                {" · "}
                마지막 사용 {new Date(invite.lastUsedAt).toLocaleString("ko-KR")}
              </>
            )}
          </p>
          {invite.notes && (
            <p className="text-xs text-tertiary mt-1.5 italic">메모: {invite.notes}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {invite.status === "pending" && (
            <>
              <button
                onClick={() => onAct("approve")}
                disabled={acting}
                className="text-xs rounded-lg bg-green-600 hover:bg-green-500 text-white px-2.5 py-1.5 disabled:opacity-40"
              >
                {acting ? "..." : "승인"}
              </button>
              <button
                onClick={() => {
                  const reason = prompt("거절 사유 (선택)");
                  onAct("reject", reason ?? undefined);
                }}
                disabled={acting}
                className="text-xs rounded-lg border border-border bg-canvas hover:bg-wash text-tertiary px-2.5 py-1.5 disabled:opacity-40"
              >
                거절
              </button>
            </>
          )}
          {invite.status === "approved" && (
            <>
              <button
                onClick={() => {
                  const reason = prompt("취소 사유 (선택)");
                  onAct("revoke", reason ?? undefined);
                }}
                disabled={acting}
                className="text-xs rounded-lg bg-red-600 hover:bg-red-500 text-white px-2.5 py-1.5 disabled:opacity-40"
              >
                취소
              </button>
              <button
                onClick={() => onAct("approve")}
                disabled={acting}
                className="text-xs rounded-lg border border-border bg-canvas hover:bg-wash text-tertiary px-2.5 py-1.5 disabled:opacity-40"
              >
                이메일 재발송
              </button>
            </>
          )}
          {invite.status === "revoked" && (
            <button
              onClick={() => onAct("approve")}
              disabled={acting}
              className="text-xs rounded-lg bg-green-600 hover:bg-green-500 text-white px-2.5 py-1.5 disabled:opacity-40"
            >
              재승인
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
