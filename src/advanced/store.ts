import { originOf } from "../data/provenance";
import type { Project } from "./types";
import { validateProject } from "./engine";
import { newProject, newUnit, newLoan, uid } from "./defaults";
import { newTools } from "./toolSchema";
export type Revision = {
  id: string;
  projectId: string;
  name: string;
  date: string;
  author: string;
  note: string;
  project: Project;
};
export type Workspace = {
  version: 2;
  projects: Project[];
  revisions: Revision[];
};
export const ADVANCED_KEY = "propertyiq:workspace:v2";
const plain = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
function shape(value: unknown, reference: unknown, path: string) {
  if (reference === null) {
    if (
      value !== null &&
      (typeof value !== "number" || !Number.isFinite(value))
    )
      throw new Error(`${path}: expected a blank or finite number.`);
    return;
  }
  if (Array.isArray(reference)) {
    if (!Array.isArray(value) || value.length > 5000)
      throw new Error(`${path}: invalid array.`);
    if (reference.length) value.forEach((v) => shape(v, reference[0], path));
    return;
  }
  if (plain(reference)) {
    if (!plain(value)) throw new Error(`${path}: invalid record.`);
    for (const [k, v] of Object.entries(reference))
      shape(value[k], v, `${path}.${k}`);
    return;
  }
  if (
    typeof value !== typeof reference ||
    (typeof value === "number" && !Number.isFinite(value))
  )
    throw new Error(`${path}: invalid value.`);
}
export function checkProject(value: unknown): Project {
  if (!plain(value)) throw new Error("Invalid project.");
  if (
    value.origin !== undefined &&
    !["example", "user", "unknown"].includes(value.origin as string)
  )
    throw new Error("Invalid project origin.");
  value = { ...value, origin: originOf(value as Project) };
  shape(value, newProject(), "project");
  const p = value as Project;
  if (p.tools) {
    shape(p.tools, newTools(), "decision tools");
    shape(
      p.tools.offers,
      [
        {
          id: "",
          name: "",
          amount: 0,
          rate: 0,
          amort: 360,
          io: 0,
          maturity: 60,
          fee: 0,
          penalty: 0,
          reserve: 0,
          source: "",
        },
      ],
      "offers",
    );
    shape(
      p.tools.details,
      [
        {
          id: "",
          month: "",
          kind: "",
          unit: "",
          category: "",
          amount: 0,
          source: "",
        },
      ],
      "operating details",
    );
    shape(
      p.tools.sources,
      [{ metric: "", evidenceId: "", note: "", reviewed: "" }],
      "calculation sources",
    );
    shape(
      p.tools.decisions,
      [
        {
          id: "",
          date: "",
          kind: "",
          title: "",
          status: "",
          owner: "",
          due: "",
          rationale: "",
          outcome: "",
          evidenceId: "",
        },
      ],
      "decisions",
    );
    shape(
      p.tools.reconciliation.benchmarks,
      [
        {
          id: "",
          metric: "",
          value: 0,
          source: "",
          locator: "",
          definition: "",
          attachmentId: "",
          evidenceId: "",
        },
      ],
      "benchmarks",
    );
    // Case-study values deliberately allow null, so blank templates never invent actuals.
    for (const row of p.tools.caseStudy.rows)
      for (const key of ["acquisition", "actual", "forecast"] as const)
        if (
          row[key] !== null &&
          (typeof row[key] !== "number" || !Number.isFinite(row[key]))
        )
          throw new Error("Invalid case-study value.");
    shape(
      p.tools.absorption.deposits,
      [{ id: "", unit: "", month: 1, amount: 0, refundMonth: 0, note: "" }],
      "deposits",
    );
  }
  p.units.forEach((u) => {
    if (
      u.renovationEnabled !== undefined &&
      typeof u.renovationEnabled !== "boolean"
    )
      throw new Error("Invalid renovation toggle.");
    if (u.events)
      shape(
        u.events,
        [{ id: "", month: 1, kind: "", amount: 0, duration: 1, note: "" }],
        "lease events",
      );
  });
  p.units.forEach((v) => shape(v, newUnit(), "unit"));
  p.loans.forEach((v) => shape(v, newLoan(), "loan"));
  shape(
    p.budget,
    [
      {
        id: "",
        name: "",
        category: "",
        amount: 0,
        start: 1,
        duration: 1,
        debtEligible: true,
      },
    ],
    "budget",
  );
  p.loans.forEach((l) => {
    shape(l.ratePoints, [{ month: 1, annual: 0.06 }], "rate points");
    if (!["term", "construction"].includes(l.kind))
      throw new Error("Unknown loan type.");
  });
  shape(
    p.actuals,
    [
      {
        month: "2026-01",
        rent: 0,
        otherIncome: 0,
        opex: 0,
        capex: 0,
        debtService: 0,
      },
    ],
    "actuals",
  );
  shape(p.historical, [{ date: "2026-01-01", amount: 0, note: "" }], "history");
  shape(
    p.evidence,
    [
      {
        id: "",
        type: "",
        title: "",
        source: "",
        date: "",
        status: "",
        value: 0,
        note: "",
      },
    ],
    "evidence",
  );
  shape(
    p.tasks,
    [{ id: "", title: "", owner: "", due: "", status: "", note: "" }],
    "tasks",
  );
  if (
    ![
      "acquisition",
      "existing",
      "development-sale",
      "development-hold",
    ].includes(p.strategy) ||
    p.units.some((u) => !["renew", "vacate"].includes(u.renewal))
  )
    throw new Error("Unknown strategy or lease action.");
  const errors = validateProject(p);
  if (errors.length) throw new Error(errors[0]);
  return structuredClone(p);
}
export function decodeWorkspace(text: string): Workspace {
  const raw: unknown = JSON.parse(text);
  if (
    !plain(raw) ||
    raw.version !== 2 ||
    !Array.isArray(raw.projects) ||
    raw.projects.length > 100 ||
    !Array.isArray(raw.revisions) ||
    raw.revisions.length > 100
  )
    throw new Error("Unsupported workspace backup.");
  const projects = raw.projects.map(checkProject);
  if (new Set(projects.map((p) => p.id)).size !== projects.length)
    throw new Error("Duplicate project IDs.");
  const revisions = raw.revisions.map((r: unknown) => {
    if (
      !plain(r) ||
      ["id", "projectId", "name", "date", "author", "note"].some(
        (k) => typeof r[k] !== "string",
      )
    )
      throw new Error("Invalid revision.");
    return { ...r, project: checkProject(r.project) } as Revision;
  });
  return { version: 2, projects, revisions };
}
export function readWorkspace(): Workspace {
  const text = localStorage.getItem(ADVANCED_KEY);
  return text
    ? decodeWorkspace(text)
    : { version: 2, projects: [], revisions: [] };
}
export function persistWorkspace(w: Workspace) {
  localStorage.setItem(ADVANCED_KEY, JSON.stringify(w));
}
let connection: Promise<IDBDatabase> | null = null;
function database() {
  if (!connection)
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("propertyiq-files", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("files");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  return connection;
}
export async function saveAttachment(id: string, file: Blob) {
  // Store bytes, rather than platform-specific File/Blob objects. Some WebKit
  // implementations cannot structured-clone those objects into IndexedDB.
  const bytes = await file.arrayBuffer();
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put({ bytes, type: file.type }, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function getAttachment(id: string): Promise<Blob | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const r = db.transaction("files").objectStore("files").get(id);
    r.onsuccess = () => {
      const value: unknown = r.result;
      if (value instanceof Blob)
        resolve(value); // Existing locally stored files.
      else if (
        plain(value) &&
        value.bytes instanceof ArrayBuffer &&
        typeof value.type === "string"
      )
        resolve(new Blob([value.bytes], { type: value.type }));
      else if (value === undefined) resolve(null);
      else reject(new Error("Stored evidence file has an unsupported format."));
    };
    r.onerror = () => reject(r.error);
  });
}
export async function exportBackup(w: Workspace): Promise<string> {
  const attachments: { id: string; type: string; base64: string }[] = [];
  for (const p of [...w.projects, ...w.revisions.map((r) => r.project)])
    for (const e of p.evidence)
      if (e.attachmentId && !attachments.some((a) => a.id === e.attachmentId)) {
        const file = await getAttachment(e.attachmentId);
        if (file) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });
          attachments.push({ id: e.attachmentId, type: file.type, base64 });
        } else
          throw new Error(
            `Missing attachment for ${e.title}. Restore its source file before creating a complete backup.`,
          );
      }
  return JSON.stringify({ ...w, attachments }, null, 2);
}
export async function restoreBackup(text: string) {
  const w = decodeWorkspace(text);
  const raw = JSON.parse(text);
  const idMap = new Map<string, string>();
  const refs = new Set(
    [...w.projects, ...w.revisions.map((r) => r.project)].flatMap((p) =>
      p.evidence.flatMap((e) => (e.attachmentId ? [e.attachmentId] : [])),
    ),
  );
  const files = raw.attachments ?? [];
  if (!Array.isArray(files) || files.length > 500)
    throw new Error("Invalid attachment backup.");
  const seen = new Set<string>();
  const decodedFiles: { id: string; type: string; bytes: Uint8Array }[] = [];
  for (const a of files) {
    if (
      !plain(a) ||
      typeof a.id !== "string" ||
      seen.has(a.id) ||
      typeof a.type !== "string" ||
      typeof a.base64 !== "string" ||
      a.base64.length > 14 * 1024 * 1024
    )
      throw new Error("Invalid or duplicate attachment.");
    seen.add(a.id);
    const bytes = Uint8Array.from(atob(a.base64), (c) => c.charCodeAt(0));
    decodedFiles.push({ id: a.id, type: a.type, bytes });
  }
  for (const ref of refs)
    if (!seen.has(ref))
      throw new Error(
        "Backup is missing a referenced evidence file. Restore a complete portable backup.",
      );
  for (const a of decodedFiles) {
    const id = uid();
    idMap.set(a.id, id);
    await saveAttachment(id, new Blob([a.bytes as BlobPart], { type: a.type }));
  }
  for (const p of [...w.projects, ...w.revisions.map((r) => r.project)])
    p.evidence = p.evidence.map((e) =>
      e.attachmentId && idMap.has(e.attachmentId)
        ? { ...e, attachmentId: idMap.get(e.attachmentId) }
        : e,
    );
  return w;
}
