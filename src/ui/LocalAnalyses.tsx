import LoadingFeedback, { BusyLabel } from "./LoadingFeedback";
import { useState } from "react";
import { Save, FolderOpen, Plus, Trash2 } from "lucide-react";
import { download } from "../data/export";
import type { Assumptions } from "../finance/types";
import type { ScenarioSettings } from "./Sensitivity";
import {
  decodeSaved,
  encodeSaved,
  saveAnalysis,
  STORAGE_KEY,
  type SavedAnalysis,
} from "../data/storage";
export default function LocalAnalyses({
  a,
  scenarios,
  onLoad,
  onNew,
}: {
  a: Assumptions;
  scenarios: ScenarioSettings;
  onLoad: (saved: SavedAnalysis) => void;
  onNew: () => void;
}) {
  const [items, setItems] = useState<SavedAnalysis[]>([]),
    [open, setOpen] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [restoring, setRestoring] = useState(false);
  function read() {
    try {
      setItems(decodeSaved(localStorage.getItem(STORAGE_KEY)));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function save() {
    try {
      setItems(saveAnalysis(localStorage, a, scenarios));
      setMessage(
        "Analysis saved in this browser. Clearing browser data erases it, so download a backup from the Backup menu for anything important.",
      );
      setError("");
    } catch (e) {
      setError(`Unable to save: ${(e as Error).message}`);
      setMessage("");
    }
  }
  function remove(id: string) {
    if (
      !window.confirm(
        "Delete this saved analysis from this browser? Download a backup first if needed.",
      )
    )
      return;
    try {
      const next = items.filter((v) => v.id !== id);
      localStorage.setItem(STORAGE_KEY, encodeSaved(next));
      setItems(next);
      setMessage("Saved analysis deleted from this browser.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="local-analyses no-print">
      <div className="local-tools">
        <div>
          <button className="text-button" onClick={onNew}>
            <Plus size={12} />
            New analysis
          </button>
          <button className="text-button" onClick={save}>
            <Save size={12} />
            Save locally
          </button>
          <button
            className="text-button"
            onClick={() => {
              read();
              setOpen((v) => !v);
            }}
          >
            <FolderOpen size={12} />
            Load saved
          </button>
          <details className="local-backup">
            <summary className="text-button">Backup</summary>
          <button
            className="text-button"
            onClick={() => {
              try {
                download(
                  "propertyiq-quick-backup.json",
                  encodeSaved(decodeSaved(localStorage.getItem(STORAGE_KEY))),
                  "application/json",
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Download Quick backup
          </button>
          <label className="text-button">
            {restoring ? (
              <BusyLabel>Restoring backup…</BusyLabel>
            ) : (
              "Restore Quick backup"
            )}
            <input
              aria-label="Restore Quick backup"
              disabled={restoring}
              aria-busy={restoring}
              type="file"
              accept=".json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setRestoring(true);
                setError("");
                setMessage("");
                try {
                  if (file.size > 5 * 1024 * 1024)
                    throw new Error("Quick backup limit is 5 MB.");
                  const restored = decodeSaved(await file.text());
                  const next = [
                    ...decodeSaved(localStorage.getItem(STORAGE_KEY)),
                    ...restored.map((x) => ({ ...x, id: crypto.randomUUID() })),
                  ];
                  localStorage.setItem(STORAGE_KEY, encodeSaved(next));
                  setItems(next);
                  setMessage(
                    `Restored ${restored.length} snapshots; existing analyses were preserved.`,
                  );
                } catch (error) {
                  setError((error as Error).message);
                } finally {
                  e.target.value = "";
                  setRestoring(false);
                }
              }}
            />
          </label>
          </details>
        </div>
        <span>Saved on this device and browser only</span>
      </div>
      {restoring && <LoadingFeedback label="Restoring Quick analyses…" />}
      {message && (
        <div className="local-message" role="status">
          {message}
          <button
            aria-label="Dismiss save message"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="alert error" role="alert">
          {error}
          <p>
            Browser storage may be disabled or full. Clearing browser data
            removes saved analyses.
          </p>
          <button
            className="text-button"
            onClick={() => {
              try {
                if (
                  !window.confirm(
                    "Permanently clear all saved Quick analyses from this browser?",
                  )
                )
                  return;
                localStorage.removeItem(STORAGE_KEY);
                setItems([]);
                setError("");
                setMessage("PropertyIQ local saved data cleared.");
              } catch {
                setError("Browser storage is unavailable.");
              }
            }}
          >
            Clear PropertyIQ saved data
          </button>
        </div>
      )}
      {open && (
        <div className="saved-list">
          <p>
            Saved analyses are browser-local snapshots. Clearing browser data
            removes them. Raw rent-roll files are never saved.
          </p>
          {items.length === 0 ? (
            <span>
              No saved analyses yet. Use “Save locally” to save valid inputs.
            </span>
          ) : (
            items.map((item) => (
              <div key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{new Date(item.savedAt).toLocaleString()}</small>
                </div>
                <div>
                  <button
                    className="button small"
                    onClick={() => {
                      onLoad(item);
                      setOpen(false);
                      setMessage("Saved analysis loaded.");
                    }}
                  >
                    Load
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Delete saved ${item.name}`}
                    onClick={() => remove(item.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
