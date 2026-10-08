import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

export function BusyLabel({ children }: { children: ReactNode }) {
  return (
    <>
      <LoaderCircle className="busy-icon" aria-hidden="true" />
      {children}
    </>
  );
}

export default function LoadingFeedback({
  label,
  skeleton = false,
}: {
  label: string;
  skeleton?: boolean;
}) {
  return (
    <div
      className="loading-feedback"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p>
        <BusyLabel>{label}</BusyLabel>
      </p>
      {skeleton && (
        <div className="loading-skeleton" aria-hidden="true">
          <div />
          <div />
          <div />
        </div>
      )}
    </div>
  );
}
