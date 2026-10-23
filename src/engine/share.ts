import { cloneInput, DEFAULT_INPUT, stationIds, validateInput } from './simulation';
import type { SimulationInput, StationId } from './simulation';

export type Scenario = { input: SimulationInput; target: StationId; newSeconds: number; locale: 'ar' | 'en' };

export const DEFAULT_SCENARIO: Scenario = { input: cloneInput(DEFAULT_INPUT), target: 'B', newSeconds: 20, locale: 'ar' };
const parameterNames = ['v', 'n', 'a', 'b', 'c', 'ab', 'bc', 'target', 'new', 'lang'] as const;

function defaultScenario(): Scenario {
  return { ...DEFAULT_SCENARIO, input: cloneInput(DEFAULT_SCENARIO.input) };
}

function validateScenario(scenario: Scenario): string[] {
  const errors = validateInput(scenario.input);
  if (!stationIds.includes(scenario.target)) errors.push('target.invalid');
  if (!Number.isInteger(scenario.newSeconds) || scenario.newSeconds < 1 || scenario.newSeconds > 300) errors.push('new.range');
  if (scenario.locale !== 'ar' && scenario.locale !== 'en') errors.push('lang.invalid');
  return errors;
}

/** A malformed URL never partly applies settings: callers show an error and offer the example. */
export function parseScenario(search: string): { scenario: Scenario; error: string | null } {
  const query = search.startsWith('?') ? search.slice(1) : search;
  if (!query) return { scenario: defaultScenario(), error: null };
  const params = new URLSearchParams(query);
  const keys = [...params.keys()];
  if (keys.length !== parameterNames.length || parameterNames.some(key => params.getAll(key).length !== 1) || keys.some(key => !parameterNames.includes(key as typeof parameterNames[number]))) {
    return { scenario: defaultScenario(), error: 'scenario.parameters' };
  }
  const numericNames = ['v', 'n', 'a', 'b', 'c', 'ab', 'bc', 'new'] as const;
  if (numericNames.some(key => !/^\d+$/.test(params.get(key) ?? ''))) {
    return { scenario: defaultScenario(), error: 'scenario.integers' };
  }
  const number = (name: typeof numericNames[number]) => Number(params.get(name));
  const scenario: Scenario = {
    input: {
      modelVersion: number('v') as 1,
      batchSize: number('n'),
      processingSeconds: [number('a'), number('b'), number('c')],
      transferSeconds: [number('ab'), number('bc')],
    },
    target: params.get('target') as StationId,
    newSeconds: number('new'),
    locale: params.get('lang') as 'ar' | 'en',
  };
  const errors = validateScenario(scenario);
  return errors.length ? { scenario: defaultScenario(), error: errors.join(', ') } : { scenario, error: null };
}

export function buildShareUrl(scenario: Scenario, origin: string): string {
  const errors = validateScenario(scenario);
  if (errors.length) throw new Error(errors.join(', '));
  const url = new URL(origin);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('url.protocol');
  const { input } = scenario;
  url.search = new URLSearchParams({
    v: String(input.modelVersion), n: String(input.batchSize),
    a: String(input.processingSeconds[0]), b: String(input.processingSeconds[1]), c: String(input.processingSeconds[2]),
    ab: String(input.transferSeconds[0]), bc: String(input.transferSeconds[1]),
    target: scenario.target, new: String(scenario.newSeconds), lang: scenario.locale,
  }).toString();
  url.hash = '';
  return url.toString();
}
