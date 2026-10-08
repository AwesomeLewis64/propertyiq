import { simulate } from "./risk";
import type { Project } from "./types";
const worker = globalThis as unknown as {
  onmessage: ((e: MessageEvent<Project>) => void) | null;
  postMessage: (v: unknown) => void;
};
worker.onmessage = (e) => {
  try {
    worker.postMessage({ result: simulate(e.data) });
  } catch (error) {
    worker.postMessage({
      error: error instanceof Error ? error.message : "Simulation failed.",
    });
  }
};
