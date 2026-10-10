import { useState, type ReactNode } from "react";

/**
 * A long table (or list) behind a one-line summary with its row count, so the
 * page stays scannable. Short content starts open; long content starts closed.
 */
export default function Collapsible({
  title,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? (count ?? 0) <= 12);
  return (
    <details
      className="adv-details adv-collapse"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <span>{title}</span>
        {count !== undefined && <small>{count} rows</small>}
      </summary>
      {children}
    </details>
  );
}
