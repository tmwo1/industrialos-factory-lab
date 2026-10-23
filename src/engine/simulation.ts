/**
 * IndustrialOS Factory Lab, deterministic model v1.
 *
 * All jobs are released at t=0. Each station has one FIFO server. The two
 * transfers have fixed delays and unlimited concurrent capacity. Waiting
 * buffers are unlimited. Time is represented by integer milliseconds.
 */
export type StationId = 'A' | 'B' | 'C';
export const stationIds: readonly StationId[] = ['A', 'B', 'C'];

export type SimulationInput = {
  modelVersion: 1;
  batchSize: number;
  processingSeconds: [number, number, number];
  transferSeconds: [number, number];
};

export type JobInterval = {
  jobId: number;
  stationId: StationId;
  arrivalMs: number;
  startMs: number;
  finishMs: number;
};

export type SimulationEvent = {
  seq: number;
  timeMs: number;
  kind: 'arrive' | 'start' | 'finish';
  jobId: number;
  stationId: StationId;
};

export type SimulationResult = {
  input: SimulationInput;
  events: SimulationEvent[];
  intervals: JobInterval[];
  metrics: {
    makespanMs: number;
    meanFlowMs: number;
    meanWaitMs: number;
    /** Completed pieces per hour over this finite batch. */
    batchRate: number;
    /** Theoretical pieces per hour once the line reaches steady state. */
    capacity: number;
    bottlenecks: StationId[];
    /** Busy time / makespan, each a ratio between 0 and 1. */
    utilization: [number, number, number];
  };
};

export type StationSnapshot = {
  id: StationId;
  queued: number[];
  processing: number | null;
  progress: number;
};

export type SimulationSnapshot = {
  timeMs: number;
  completed: number;
  wip: number;
  stations: StationSnapshot[];
  transit: {
    jobId: number;
    from: StationId;
    to: StationId;
    progress: number;
  }[];
  completedJobs: number[];
};

export const DEFAULT_INPUT: SimulationInput = {
  modelVersion: 1,
  batchSize: 10,
  processingSeconds: [20, 40, 25],
  transferSeconds: [5, 5],
};

function boundedInteger(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/** Returns stable error codes; also validates values received across worker/URL boundaries. */
export function validateInput(input: unknown): string[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['input.object'];
  const value = input as Record<string, unknown>;
  const errors: string[] = [];
  if (value.modelVersion !== 1) errors.push('modelVersion.unsupported');
  if (!boundedInteger(value.batchSize, 1, 200)) errors.push('batchSize.range');
  if (!Array.isArray(value.processingSeconds) || value.processingSeconds.length !== 3) {
    errors.push('processingSeconds.length');
  } else {
    for (let i = 0; i < 3; i++) {
      if (!boundedInteger(value.processingSeconds[i], 1, 300)) errors.push(`processingSeconds.${i}.range`);
    }
  }
  if (!Array.isArray(value.transferSeconds) || value.transferSeconds.length !== 2) {
    errors.push('transferSeconds.length');
  } else {
    for (let i = 0; i < 2; i++) {
      if (!boundedInteger(value.transferSeconds[i], 0, 30)) errors.push(`transferSeconds.${i}.range`);
    }
  }
  return errors;
}

export function cloneInput(input: SimulationInput): SimulationInput {
  return {
    modelVersion: input.modelVersion,
    batchSize: input.batchSize,
    processingSeconds: [...input.processingSeconds],
    transferSeconds: [...input.transferSeconds],
  };
}

/** Pure FIFO recurrence, independent of frame rate, playback, or graphics. */
export function simulate(source: SimulationInput): SimulationResult {
  const errors = validateInput(source);
  if (errors.length) throw new Error(errors.join(', '));
  const input = cloneInput(source);
  const intervals: JobInterval[] = [];
  const events: SimulationEvent[] = [];
  const availableAt = [0, 0, 0];
  let totalWaitMs = 0;
  let totalFlowMs = 0;

  for (let jobId = 1; jobId <= input.batchSize; jobId++) {
    let upstreamFinish = 0;
    for (let index = 0; index < 3; index++) {
      const stationId = stationIds[index];
      const arrivalMs = index === 0 ? 0 : upstreamFinish + input.transferSeconds[index - 1] * 1000;
      const startMs = Math.max(arrivalMs, availableAt[index]);
      const finishMs = startMs + input.processingSeconds[index] * 1000;
      intervals.push({ jobId, stationId, arrivalMs, startMs, finishMs });
      events.push(
        { seq: 0, timeMs: arrivalMs, kind: 'arrive', jobId, stationId },
        { seq: 0, timeMs: startMs, kind: 'start', jobId, stationId },
        { seq: 0, timeMs: finishMs, kind: 'finish', jobId, stationId },
      );
      totalWaitMs += startMs - arrivalMs;
      availableAt[index] = finishMs;
      upstreamFinish = finishMs;
    }
    totalFlowMs += upstreamFinish;
  }

  const eventOrder = { finish: 0, arrive: 1, start: 2 } as const;
  events.sort((a, b) =>
    a.timeMs - b.timeMs || eventOrder[a.kind] - eventOrder[b.kind] ||
    stationIds.indexOf(a.stationId) - stationIds.indexOf(b.stationId) || a.jobId - b.jobId,
  );
  events.forEach((event, index) => { event.seq = index + 1; });
  const makespanMs = availableAt[2];
  const cycleSeconds = Math.max(...input.processingSeconds);
  return {
    input,
    events,
    intervals,
    metrics: {
      makespanMs,
      meanFlowMs: totalFlowMs / input.batchSize,
      meanWaitMs: totalWaitMs / input.batchSize,
      batchRate: input.batchSize * 3_600_000 / makespanMs,
      capacity: 3600 / cycleSeconds,
      bottlenecks: stationIds.filter((_, index) => input.processingSeconds[index] === cycleSeconds),
      utilization: input.processingSeconds.map(seconds => input.batchSize * seconds * 1000 / makespanMs) as [number, number, number],
    },
  };
}

/**
 * A fresh snapshot after all events at t. Processing and transit intervals are
 * half-open: [start, finish). Zero-duration transfers never appear in transit.
 * The result and its input are never mutated by playback or scrubbing.
 */
export function snapshotAt(result: SimulationResult, requestedTimeMs: number): SimulationSnapshot {
  const timeMs = Math.max(0, Math.min(result.metrics.makespanMs, Number.isNaN(requestedTimeMs) ? 0 : requestedTimeMs));
  const stations: StationSnapshot[] = stationIds.map(id => ({ id, queued: [], processing: null, progress: 0 }));
  const transit: SimulationSnapshot['transit'] = [];
  const completedJobs: number[] = [];

  for (const interval of result.intervals) {
    const index = stationIds.indexOf(interval.stationId);
    const station = stations[index];
    if (interval.arrivalMs <= timeMs && timeMs < interval.startMs) station.queued.push(interval.jobId);
    if (interval.startMs <= timeMs && timeMs < interval.finishMs) {
      station.processing = interval.jobId;
      station.progress = (timeMs - interval.startMs) / (interval.finishMs - interval.startMs);
    }
    if (index === 2 && interval.finishMs <= timeMs) completedJobs.push(interval.jobId);
    if (index < 2) {
      const nextArrivalMs = interval.finishMs + result.input.transferSeconds[index] * 1000;
      if (interval.finishMs <= timeMs && timeMs < nextArrivalMs) {
        transit.push({
          jobId: interval.jobId,
          from: interval.stationId,
          to: stationIds[index + 1],
          progress: (timeMs - interval.finishMs) / (nextArrivalMs - interval.finishMs),
        });
      }
    }
  }
  return { timeMs, completed: completedJobs.length, wip: result.input.batchSize - completedJobs.length, stations, transit, completedJobs };
}
