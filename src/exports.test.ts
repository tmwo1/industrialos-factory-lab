import { describe, expect, it } from 'vitest';
import { createEventsCsv } from './exports';
import { cloneInput, DEFAULT_INPUT, simulate } from './engine/simulation';

describe('CSV event export', () => {
  const base = simulate(DEFAULT_INPUT);
  const fasterInput = cloneInput(DEFAULT_INPUT);
  fasterInput.processingSeconds[1] = 20;
  const candidate = simulate(fasterInput);

  it.each(['ar', 'en'] as const)('includes the complete 180-event comparison with UTF-8 BOM in %s', locale => {
    const csv = createEventsCsv(base, candidate, locale);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv.endsWith('\r\n')).toBe(true);
    const rows = csv.slice(1).split('\r\n').filter(Boolean);
    expect(rows).toHaveLength(181);
    expect(rows.every(row => /^".*",".*",".*",".*",".*",".*"$/.test(row))).toBe(true);
    expect(rows[90]).toContain(',"90","455","10","C",');
    expect(rows[180]).toContain(',"90","300","10","C",');
  });

  it('uses readable Arabic labels and neutral candidate wording', () => {
    const csv = createEventsCsv(base, candidate, 'ar');
    expect(csv).toContain('"السيناريو","ترتيب الحدث","الزمن بالثواني","رقم القطعة","المحطة","الحدث"');
    expect(csv).toContain('"الخط الأساسي"');
    expect(csv).toContain('"السيناريو البديل"');
    expect(csv).toContain('"بدء المعالجة"');
    expect(csv).toContain('"انتهاء المعالجة"');
  });

  it('does not describe a slower run as improved', () => {
    const slowerInput = cloneInput(DEFAULT_INPUT);
    slowerInput.processingSeconds[1] = 80;
    const slower = simulate(slowerInput);
    expect(slower.metrics.makespanMs).toBeGreaterThan(base.metrics.makespanMs);
    const arabic = createEventsCsv(base, slower, 'ar');
    const english = createEventsCsv(base, slower, 'en');
    expect(arabic).toContain('السيناريو البديل');
    expect(arabic).not.toContain('المحسّن');
    expect(english).toContain('CANDIDATE');
    expect(english.toLowerCase()).not.toContain('improved');
  });

  it('does not mutate either run while generating the file', () => {
    const before = JSON.stringify([base, candidate]);
    createEventsCsv(base, candidate, 'en');
    expect(JSON.stringify([base, candidate])).toBe(before);
  });
});
