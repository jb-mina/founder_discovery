"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Loader2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

type Variant = "active" | "archived";

export type CardActionMenuProps = {
  variant: Variant;
  onArchive?: () => void | Promise<void>;
  onRestore?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  // Render the trigger inline. Default size is compact for use in row cards.
  size?: "sm" | "md";
};

// Stops the surrounding Link/anchor from navigating when the user clicks the
// trigger or any item. ProblemRow wraps the entire card in a <Link>.
function suppress(e: React.MouseEvent | React.PointerEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export function CardActionMenu({
  variant,
  onArchive,
  onRestore,
  onDelete,
  size = "sm",
}: CardActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function run(handler?: () => void | Promise<void>) {
    if (!handler) return;
    setPending(true);
    try {
      await handler();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  const triggerSize = size === "sm" ? 14 : 18;
  const triggerPad = size === "sm" ? "p-1" : "p-1.5";

  return (
    <div ref={ref} className="relative shrink-0" onClick={suppress} onPointerDown={suppress}>
      <button
        type="button"
        aria-label="카드 액션"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          suppress(e);
          setOpen((v) => !v);
        }}
        className={`${triggerPad} rounded-md text-subtle hover:text-secondary hover:bg-wash`}
      >
        {pending ? (
          <Loader2 size={triggerSize} className="animate-spin" />
        ) : (
          <MoreHorizontal size={triggerSize} />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-lg border border-border bg-surface shadow-lg py-1"
        >
          {variant === "active" && onArchive && (
            <MenuItem
              icon={<Archive size={14} />}
              label="아카이브"
              hint="활성 허브에서 숨기기"
              onClick={() => run(onArchive)}
              disabled={pending}
            />
          )}
          {variant === "archived" && onRestore && (
            <MenuItem
              icon={<ArchiveRestore size={14} />}
              label="복원"
              hint="활성 허브로 되돌리기"
              onClick={() => run(onRestore)}
              disabled={pending}
            />
          )}
          {variant === "archived" && onDelete && (
            <MenuItem
              icon={<Trash2 size={14} />}
              label="영구 삭제"
              hint="자식 기록까지 모두 삭제"
              onClick={() => run(onDelete)}
              disabled={pending}
              danger
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        suppress(e);
        if (!disabled) onClick(e);
      }}
      disabled={disabled}
      className={`w-full flex items-start gap-2 px-3 py-2 text-left text-xs hover:bg-wash disabled:opacity-50 ${
        danger ? "text-red-600 hover:bg-red-50" : "text-foreground"
      }`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-subtle text-[11px] mt-0.5">{hint}</span>}
      </span>
    </button>
  );
}
