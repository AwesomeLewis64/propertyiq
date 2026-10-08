import LoadingFeedback, { BusyLabel } from "../ui/LoadingFeedback";
import { provenance } from "../data/provenance";
import { useMemo, useState } from "react";
import { forecast } from "./engine";
import type { Project } from "./types";
import type { Workspace } from "./store";
import { exportBackup, restoreBackup } from "./store";
import { uid } from "./defaults";
import { Card, TextField, Plot } from "./Controls";
import { download } from "../data/export";
import { money, pct, multiple } from "../ui/format";
export default function PortfolioPanel({
  workspace,
  current,
  onWorkspace,
  onSelect,
}: {
  workspace: Workspace;
  current: Project;
  onWorkspace: (w: Workspace) => void;
  onSelect: (id: string) => void;
}) {
  const [author, setAuthor] = useState(""),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const models = useMemo(
    () => workspace.projects.map((p) => ({ p, m: forecast(p) })),
    [workspace.projects],
  );
  const calendar = useMemo(() => {
    const periods = new Map<
      string,
      { month: string; calls: number; distributions: number }
    >();
    for (const { p, m } of models) {
      if (m.errors.length) continue;
      const start = p.startDate.slice(0, 7),
        initial = periods.get(start) ?? {
          month: start,
          calls: 0,
          distributions: 0,
        };
      initial.calls += m.initialEquity;
      periods.set(start, initial);
      for (const r of m.rows) {
        const month = r.date.slice(0, 7),
          period = periods.get(month) ?? { month, calls: 0, distributions: 0 };
        period.calls += r.capitalCall;
        period.distributions += r.distribution;
        periods.set(month, period);
      }
    }
    return [...periods.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [models]);
  async function backup() {
    setBusy("backup");
    setError("");
    setStatus("");
    try {
      download(
        "propertyiq-workspace-backup.json",
        await exportBackup(workspace),
        "application/json",
      );
      setStatus(
        "Backup downloaded, including locally available evidence files. Keep it outside this browser.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backup failed.");
    } finally {
      setBusy(null);
    }
  }
  async function restore(file: File) {
    setBusy("restore");
    setError("");
    setStatus("");
    try {
      if (file.size > 100 * 1024 * 1024)
        throw new Error("Backup limit is 100 MB.");
      const restored = await restoreBackup(await file.text());
      const idMap = new Map(restored.projects.map((p) => [p.id, uid()]));
      const projects = restored.projects.map((p) => ({
        ...p,
        id: idMap.get(p.id)!,
        name: `${p.name} (restored)`,
      }));
      if (workspace.projects.length + projects.length > 100)
        throw new Error(
          "Maximum 100 projects. Remove unused projects before importing.",
        );
      onWorkspace({
        ...workspace,
        projects: [...workspace.projects, ...projects],
        revisions: [
          ...workspace.revisions,
          ...restored.revisions.map((r) => ({
            ...r,
            id: uid(),
            projectId: idMap.get(r.projectId) ?? r.projectId,
          })),
        ].slice(-100),
      });
      setStatus(
        `Restored ${projects.length} projects as new copies; current projects were preserved.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <Card
        title="Local portfolio comparison"
        note="Projects use their own dates, strategies and financing. Calendar funding below sums modeled owner contributions/distributions; no assumption of portfolio cross-collateralization is made."
      >
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                {[
                  "Project",
                  "Strategy",
                  "Initial / as-of equity",
                  "XIRR",
                  "NPV",
                  "Multiple",
                  "Additional equity",
                  "Binding debt limit",
                  "Open diligence",
                  "Archive",
                ].map((v) => (
                  <th key={v}>{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {models.map(({ p, m }) => (
                <tr key={p.id}>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => onSelect(p.id)}
                    >
                      {p.name}
                    </button>
                  </td>
                  <td>{p.strategy}</td>
                  <td>{money(m.initialEquity)}</td>
                  <td>{pct(m.irr)}</td>
                  <td>{money(m.npv)}</td>
                  <td>{multiple(m.multiple)}</td>
                  <td>{money(m.additionalEquity)}</td>
                  <td>
                    {money(m.sizing.maximum)} ({m.sizing.binding})
                  </td>
                  <td>
                    {p.tasks.filter((t) => t.status !== "complete").length}
                  </td>
                  <td>
                    <button
                      className="button small"
                      disabled={
                        !!busy ||
                        workspace.projects.length <= 1 ||
                        !!m.errors.length
                      }
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Archive ${p.name}? It will remain recoverable in revisions.`,
                          )
                        )
                          return;
                        const next = workspace.projects.filter(
                          (x) => x.id !== p.id,
                        );
                        onWorkspace({
                          ...workspace,
                          projects: next,
                          revisions: [
                            ...workspace.revisions,
                            {
                              id: uid(),
                              projectId: p.id,
                              name: p.name,
                              date: new Date().toISOString(),
                              author: "Local workspace",
                              note: "Archived project. Restore this revision as a new copy.",
                              project: structuredClone(p),
                            },
                          ].slice(-100),
                        });
                        if (current.id === p.id) onSelect(next[0].id);
                      }}
                    >
                      Archive to revisions
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card
        title="Calendar owner-funding picture"
        note="Includes opening acquisition/as-of equity and subsequent capital calls across valid projects. Existing-property as-of equity is an opportunity-cost value, not necessarily a new cash payment."
      >
        <Plot
          source={`Forecast sources: ${[...new Set(workspace.projects.map(provenance))].join(" ")}`}
          seriesLabel="Owner contributions"
          secondLabel="Owner distributions"
          values={calendar.map((v) => v.calls)}
          second={calendar.map((v) => v.distributions)}
          labels={calendar.map((v) => v.month)}
          title="Owner contributions and distributions"
        />
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Gross contributions</th>
                <th>Distributions</th>
                <th>Net owner funding</th>
              </tr>
            </thead>
            <tbody>
              {calendar
                .filter((v) => v.calls || v.distributions)
                .map((v) => (
                  <tr key={v.month}>
                    <td>{v.month}</td>
                    <td>{money(v.calls)}</td>
                    <td>{money(v.distributions)}</td>
                    <td>{money(v.calls - v.distributions)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p>
          Project-level simulations do not estimate correlated portfolio losses
          or lender concentration. Contributions assume owners can supply the
          disclosed funds.
        </p>
      </Card>
      <Card
        title="Backups, revisions and handoff"
        note="Automatic browser saves are local convenience, not an independent backup. Backups preserve projects and available evidence attachments."
      >
        <div className="adv-actions">
          <button
            className="button primary"
            disabled={!!busy}
            aria-busy={busy === "backup"}
            onClick={() => void backup()}
          >
            {busy === "backup" ? (
              <BusyLabel>Preparing backup…</BusyLabel>
            ) : (
              "Download complete backup"
            )}
          </button>
          <label className="adv-field">
            <span>Restore backup as new project copies</span>
            <input
              type="file"
              accept=".json"
              aria-label="Restore workspace backup"
              disabled={!!busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void restore(f);
              }}
            />
          </label>
        </div>
        {busy && (
          <LoadingFeedback
            label={
              busy === "backup"
                ? "Preparing projects and attached files…"
                : "Restoring projects and attached files…"
            }
          />
        )}
        {error && <p className="alert error">{error}</p>}
        {status && (
          <p className="alert" role="status">
            {status}
          </p>
        )}
        <div className="adv-form">
          <TextField
            label="Revision author (self-reported)"
            value={author}
            onChange={setAuthor}
          />
          <TextField label="Revision note" value={note} onChange={setNote} />
        </div>
        <button
          className="button"
          disabled={!!busy || forecast(current).errors.length > 0}
          onClick={() => {
            onWorkspace({
              ...workspace,
              revisions: [
                ...workspace.revisions,
                {
                  id: uid(),
                  projectId: current.id,
                  name: current.name,
                  date: new Date().toISOString(),
                  author,
                  note,
                  project: structuredClone(current),
                },
              ].slice(-100),
            });
            setStatus(
              "Revision recorded. The latest 100 revisions are retained.",
            );
          }}
        >
          Record named revision
        </button>
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Project / revision</th>
                <th>Recorded</th>
                <th>Author</th>
                <th>Note</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {[...workspace.revisions].reverse().map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{new Date(r.date).toLocaleString()}</td>
                  <td>{r.author || "Not recorded"}</td>
                  <td>{r.note}</td>
                  <td>
                    <button
                      className="button small"
                      disabled={!!busy || workspace.projects.length >= 100}
                      onClick={() => {
                        const id = uid();
                        onWorkspace({
                          ...workspace,
                          projects: [
                            ...workspace.projects,
                            {
                              ...structuredClone(r.project),
                              id,
                              name: `${r.name} (revision copy)`,
                            },
                          ],
                        });
                        onSelect(id);
                      }}
                    >
                      Restore as new copy
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          File backups allow manual handoff to another computer. They are not
          simultaneous collaboration or a tamper-proof audit log. Restored
          evidence references rely on the included attachment files. Browser
          storage can be cleared or fill up; export backups regularly.
        </p>
      </Card>
    </>
  );
}
