import { useState } from "react";
import { Save, FolderOpen, Plus, Trash2 } from "lucide-react";
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
    [error, setError] = useState("");
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
      setMessage("Analysis saved in this browser.");
      setError("");
    } catch (e) {
      setError(`Unable to save: ${(e as Error).message}`);
      setMessage("");
    }
  }
  function remove(id: string) {
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
        </div>
        <span>Saved on this device and browser only</span>
      </div>
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
