import { useState, useRef, useEffect } from "react";
import type { ProjectEditor } from "./UnitEditor";
import type { Evidence } from "./types";
import { Card, TextField, NumberField, Select } from "./Controls";
import { uid } from "./defaults";
import { getAttachment, saveAttachment } from "./store";
import { money } from "../ui/format";
export default function DiligencePanel({ p, set }: ProjectEditor) {
  const [error, setError] = useState("");
  const latest = useRef(p);
  useEffect(() => {
    latest.current = p;
  }, [p]);
  const patch = (
    id: string,
    key: keyof Evidence,
    value: Evidence[keyof Evidence],
  ) =>
    set({
      ...p,
      evidence: p.evidence.map((e) =>
        e.id === id ? { ...e, [key]: value } : e,
      ),
    });
  const rentComps = p.evidence.filter(
      (e) => e.type === "rent comp" && e.status !== "unverified" && e.value > 0,
    ),
    saleComps = p.evidence.filter(
      (e) => e.type === "sale comp" && e.status !== "unverified" && e.value > 0,
    );
  const avg = (values: Evidence[]) =>
    values.reduce((s, e) => s + e.value, 0) / values.length;
  async function attach(id: string, file: File) {
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Attachment limit is 5 MB.");
      const attachmentId = uid();
      await saveAttachment(attachmentId, file);
      set({
        ...latest.current,
        evidence: latest.current.evidence.map((e) =>
          e.id === id
            ? { ...e, attachmentId, source: e.source || file.name }
            : e,
        ),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Attachment failed.");
    }
  }
  async function downloadAttachment(e: Evidence) {
    try {
      const file = e.attachmentId ? await getAttachment(e.attachmentId) : null;
      if (!file)
        throw new Error(
          "Attachment is unavailable on this device; restore a backup including files.",
        );
      const url = URL.createObjectURL(file),
        a = document.createElement("a");
      a.href = url;
      a.download = e.source.includes("/") ? e.title : e.source || e.title;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    }
  }
  return (
    <>
      <Card
        title="Market evidence and source records"
        note="Store comps, bids, inspections and approval evidence. Status is your recorded review, not automated verification. Files are stored locally and included in workspace backups."
      >
        <div className="adv-actions">
          <button
            className="button"
            onClick={() =>
              set({
                ...p,
                evidence: [
                  ...p.evidence,
                  {
                    id: uid(),
                    type: "rent comp",
                    title: "New evidence",
                    source: "",
                    date: new Date().toISOString().slice(0, 10),
                    status: "unverified",
                    value: 0,
                    note: "",
                  },
                ],
              })
            }
          >
            Add evidence
          </button>
          <span>
            {p.evidence.filter((e) => e.status === "unverified").length}{" "}
            unverified records
          </span>
        </div>
        {error && <p className="alert error">{error}</p>}
        <p>
          Reviewed rent comp average:{" "}
          {rentComps.length ? money(avg(rentComps)) : "N/A"} ({rentComps.length}{" "}
          records). Reviewed sale comp average:{" "}
          {saleComps.length ? money(avg(saleComps)) : "N/A"} ({saleComps.length}{" "}
          records). These unadjusted averages do not account for size, condition
          or location differences.
        </p>
        {p.evidence.map((e) => (
          <details className="adv-details" key={e.id}>
            <summary>
              {e.title} · {e.status}
              {e.date && Date.now() - Date.parse(e.date) > 180 * 86400000
                ? " · older than 180 days"
                : ""}
            </summary>
            <div className="adv-form">
              <TextField
                label="Evidence title"
                value={e.title}
                onChange={(v) => patch(e.id, "title", v)}
              />
              <Select
                label="Evidence type"
                value={e.type}
                onChange={(v) => patch(e.id, "type", v as Evidence["type"])}
                options={[
                  "rent comp",
                  "sale comp",
                  "bid",
                  "inspection",
                  "title",
                  "zoning",
                  "approval",
                  "other",
                ].map((v) => [v, v])}
              />
              <TextField
                label="Source URL or file name"
                value={e.source}
                onChange={(v) => patch(e.id, "source", v)}
              />
              <TextField
                label="Evidence date"
                value={e.date}
                type="date"
                onChange={(v) => patch(e.id, "date", v)}
              />
              <Select
                label="Recorded review status"
                value={e.status}
                onChange={(v) => patch(e.id, "status", v as Evidence["status"])}
                options={[
                  ["unverified", "Unverified"],
                  ["reviewed", "Reviewed by your team"],
                  ["confirmed", "Confirmed by your team"],
                ]}
              />
              <NumberField
                label="Comparable rent / sale price / bid value"
                value={e.value}
                onChange={(v) => patch(e.id, "value", v)}
              />
            </div>
            <label className="adv-field">
              <span>Evidence notes / comparability adjustments</span>
              <textarea
                value={e.note}
                onChange={(ev) => patch(e.id, "note", ev.target.value)}
              />
            </label>
            <div className="adv-actions">
              <label className="adv-field">
                <span>Attach local source file (up to 5 MB)</span>
                <input
                  type="file"
                  aria-label={`Attach evidence for ${e.title}`}
                  onChange={(ev) => {
                    const file = ev.target.files?.[0];
                    if (file) void attach(e.id, file);
                  }}
                />
              </label>
              {e.attachmentId && (
                <button
                  className="button small"
                  onClick={() => void downloadAttachment(e)}
                >
                  Download attached source
                </button>
              )}
              {/^https?:\/\//i.test(e.source) && (
                <a
                  className="button small"
                  href={e.source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open source
                </a>
              )}
              <button
                className="button small"
                onClick={() =>
                  set({
                    ...p,
                    evidence: p.evidence.filter((x) => x.id !== e.id),
                  })
                }
              >
                Remove evidence record
              </button>
            </div>
          </details>
        ))}
      </Card>
      <Card
        title="Diligence and municipal approval checklist"
        note="Owners, due dates and status can track work outside the model. Completion is a recorded human decision; this does not perform inspections, title review or municipal verification."
      >
        {p.tasks.map((t, i) => (
          <div className="adv-task" key={t.id}>
            <div className="adv-form">
              <TextField
                label="Task"
                value={t.title}
                onChange={(v) =>
                  set({
                    ...p,
                    tasks: p.tasks.map((x, j) =>
                      i === j ? { ...x, title: v } : x,
                    ),
                  })
                }
              />
              <TextField
                label="Responsible person"
                value={t.owner}
                onChange={(v) =>
                  set({
                    ...p,
                    tasks: p.tasks.map((x, j) =>
                      i === j ? { ...x, owner: v } : x,
                    ),
                  })
                }
              />
              <TextField
                label="Due date"
                value={t.due}
                type="date"
                onChange={(v) =>
                  set({
                    ...p,
                    tasks: p.tasks.map((x, j) =>
                      i === j ? { ...x, due: v } : x,
                    ),
                  })
                }
              />
              <Select
                label="Task status"
                value={t.status}
                onChange={(v) =>
                  set({
                    ...p,
                    tasks: p.tasks.map((x, j) =>
                      i === j ? { ...x, status: v as typeof t.status } : x,
                    ),
                  })
                }
                options={[
                  ["open", "Open"],
                  ["in progress", "In progress"],
                  ["complete", "Complete"],
                ]}
              />
            </div>
            <TextField
              label="Task findings / approval reference"
              value={t.note}
              onChange={(v) =>
                set({
                  ...p,
                  tasks: p.tasks.map((x, j) =>
                    i === j ? { ...x, note: v } : x,
                  ),
                })
              }
            />
            <button
              className="button small"
              onClick={() =>
                set({ ...p, tasks: p.tasks.filter((_, j) => i !== j) })
              }
            >
              Remove task
            </button>
          </div>
        ))}
        <button
          className="button"
          onClick={() =>
            set({
              ...p,
              tasks: [
                ...p.tasks,
                {
                  id: uid(),
                  title: "New diligence task",
                  owner: "",
                  due: "",
                  status: "open",
                  note: "",
                },
              ],
            })
          }
        >
          Add diligence task
        </button>
      </Card>
    </>
  );
}
