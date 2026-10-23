import { simulate, validateInput } from './simulation';
import type { SimulationInput, SimulationResult } from './simulation';

export type SimulationRequest = { runId: number; base: SimulationInput; candidate: SimulationInput };
export type SimulationResponse =
  | { runId: number; base: SimulationResult; candidate: SimulationResult }
  | { runId: number; error: string };

// An explicit worker port avoids mixing the DOM and WebWorker global libraries.
const workerPort = globalThis as unknown as {
  onmessage: ((event: MessageEvent<SimulationRequest>) => void) | null;
  postMessage: (response: SimulationResponse) => void;
};

workerPort.onmessage = ({ data }) => {
  const runId = data?.runId;
  try {
    if (!Number.isSafeInteger(runId)) throw new Error('runId.invalid');
    const errors = [...validateInput(data.base), ...validateInput(data.candidate)];
    if (errors.length) throw new Error(errors.join(', '));
    workerPort.postMessage({ runId, base: simulate(data.base), candidate: simulate(data.candidate) });
  } catch (error) {
    workerPort.postMessage({ runId, error: error instanceof Error ? error.message : 'simulation.failed' });
  }
};
