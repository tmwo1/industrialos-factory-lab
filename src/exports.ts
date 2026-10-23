import type { SimulationResult } from './engine/simulation';

type Locale = 'ar' | 'en';

interface ResultCardOptions {
  base: SimulationResult;
  candidate: SimulationResult;
  locale: Locale;
  shareUrl: string;
}

const copy = {
  ar: {
    title: 'تحسين المحطة المناسبة يغيّر نتيجة الخط',
    subtitle: 'تجربة قابلة لإعادة الحساب · مختبر اختناقات الإنتاج',
    base: 'الخط الأساسي',
    candidate: 'السيناريو البديل',
    reduction: 'انخفاض زمن إنهاء الدفعة',
    increase: 'زيادة زمن إنهاء الدفعة',
    same: 'دون تغيير في زمن الدفعة',
    seconds: 'ثانية',
    bottleneck: 'المحطات المحددة لطاقة الخط',
    batch: 'حجم الدفعة',
    jobs: 'قطعة',
    processing: 'المعالجة',
    transfer: 'النقل',
    model: 'إصدار النموذج',
    assumptions: 'نوع منتج واحد · آلة واحدة لكل محطة · FIFO · انتظار غير محدود',
    assumptions2: 'دفعة متاحة عند الزمن صفر · نقل متزامن · أزمنة ثابتة بلا أعطال',
    source: 'رابط إعادة التجربة',
    disclaimer: 'نتائج محاكاة تعليمية — لا تمثل وفورات مقاسة في مصنع حقيقي.',
    scenario: 'السيناريو',
    time: 'الزمن بالثواني',
    job: 'رقم القطعة',
    station: 'المحطة',
    event: 'الحدث',
    sequence: 'ترتيب الحدث',
    arrive: 'وصول',
    start: 'بدء المعالجة',
    finish: 'انتهاء المعالجة',
  },
  en: {
    title: 'Improve the right station. Change the whole line.',
    subtitle: 'A reproducible experiment · Production bottleneck lab',
    base: 'BASELINE',
    candidate: 'CANDIDATE',
    reduction: 'LESS TIME TO FINISH THE BATCH',
    increase: 'MORE TIME TO FINISH THE BATCH',
    same: 'NO CHANGE IN BATCH TIME',
    seconds: 's',
    bottleneck: 'Capacity-limiting stations',
    batch: 'Batch size',
    jobs: 'pieces',
    processing: 'Processing',
    transfer: 'Transfer',
    model: 'Model version',
    assumptions: 'One product · One machine per station · FIFO · Unlimited waiting space',
    assumptions2: 'Batch available at time zero · Concurrent transport · Fixed times, no failures',
    source: 'REPRODUCE THIS EXPERIMENT',
    disclaimer: 'Educational simulation results — not measured savings in a real factory.',
    scenario: 'Scenario',
    time: 'Time (seconds)',
    job: 'Piece ID',
    station: 'Station',
    event: 'Event',
    sequence: 'Event sequence',
    arrive: 'Arrival',
    start: 'Processing started',
    finish: 'Processing finished',
  },
} as const;

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // Immediate revocation can cancel downloads in some browser engines.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

function number(value: number, decimals = 1): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(value);
}

/** Build a UTF-8 CSV with a BOM so Arabic opens correctly in Excel. No browser side effects. */
export function createEventsCsv(
  base: SimulationResult,
  candidate: SimulationResult,
  locale: Locale,
): string {
  const t = copy[locale];
  const quote = (value: unknown): string => `"${String(value).replaceAll('"', '""')}"`;
  const rows: unknown[][] = [[t.scenario, t.sequence, t.time, t.job, t.station, t.event]];
  for (const [name, result] of [[t.base, base], [t.candidate, candidate]] as const) {
    for (const event of result.events) {
      rows.push([name, event.seq, event.timeMs / 1000, event.jobId, event.stationId, t[event.kind]]);
    }
  }
  return '\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
}

/** Download only when explicitly invoked by the user. */
export function exportEventsCsv(base: SimulationResult, candidate: SimulationResult, locale: Locale): void {
  const csv = createEventsCsv(base, candidate, locale);
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `factory-lab-events-${locale}.csv`);
}

/** A standalone share card. Native Canvas2D handles Arabic shaping and bidi text. */
export async function createResultPng({ base, candidate, locale, shareUrl }: ResultCardOptions): Promise<Blob> {
  // Wait for the page's font loading to finish, avoiding fallback glyphs in the saved image.
  if (document.fonts) await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available in this browser.');
  const t = copy[locale];
  const rtl = locale === 'ar';
  const fontFamily = '"IBM Plex Sans Arabic", "Inter", "Segoe UI", Tahoma, Arial, sans-serif';
  const emerald = '#146C4F';
  const ink = '#152A24';
  const muted = '#577067';

  function text(
    value: string,
    x: number,
    y: number,
    size: number,
    color: string,
    weight = 400,
    direction: CanvasDirection = rtl ? 'rtl' : 'ltr',
    maxWidth?: number,
  ): void {
    ctx!.font = `${weight} ${size}px ${fontFamily}`;
    ctx!.fillStyle = color;
    ctx!.direction = direction;
    ctx!.textAlign = direction === 'rtl' ? 'right' : 'left';
    ctx!.fillText(value, x, y, maxWidth);
  }

  function panel(x: number, y: number, width: number, height: number, radius: number, fill: string): void {
    ctx!.beginPath();
    ctx!.moveTo(x + radius, y);
    ctx!.lineTo(x + width - radius, y);
    ctx!.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx!.lineTo(x + width, y + height - radius);
    ctx!.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx!.lineTo(x + radius, y + height);
    ctx!.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx!.lineTo(x, y + radius);
    ctx!.quadraticCurveTo(x, y, x + radius, y);
    ctx!.closePath();
    ctx!.fillStyle = fill;
    ctx!.fill();
  }

  function settings(result: SimulationResult, title: string, left: number): void {
    panel(left, 390, 540, 160, 16, '#FFFFFF');
    const x = rtl ? left + 516 : left + 24;
    const input = result.input;
    text(title, x, 420, 17, emerald, 700);
    text(`${t.batch}: ${input.batchSize} ${t.jobs} · ${t.model}: ${input.modelVersion}`, x, 450, 15, ink, 400, undefined, 492);
    // Isolate LTR technical symbols so their order is reliable in Arabic too.
    const processing = `A ${input.processingSeconds[0]} · B ${input.processingSeconds[1]} · C ${input.processingSeconds[2]}`;
    const transfer = `A→B ${input.transferSeconds[0]} · B→C ${input.transferSeconds[1]}`;
    text(`${t.processing}: \u2066${processing}\u2069 ${t.seconds}`, x, 480, 15, ink, 400, undefined, 492);
    text(`${t.transfer}: \u2066${transfer}\u2069 ${t.seconds}`, x, 510, 15, ink, 400, undefined, 492);
  }

  ctx.fillStyle = '#F1F5EF';
  ctx.fillRect(0, 0, 1200, 800);
  ctx.fillStyle = emerald;
  ctx.fillRect(0, 0, 1200, 8);
  panel(48, 38, 34, 34, 8, emerald);
  // Original, geometric factory mark, drawn locally without remote image dependencies.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(56, 55, 18, 9);
  ctx.fillRect(56, 48, 4, 13);
  ctx.fillRect(63, 51, 4, 10);
  ctx.fillRect(70, 46, 4, 15);
  text('IndustrialOS', 94, 60, 23, ink, 700, 'ltr');
  text('FACTORY LAB / 01', 1152, 60, 14, muted, 600, 'rtl');
  text(t.title, rtl ? 1152 : 48, 119, rtl ? 31 : 32, ink, 700, undefined, 1104);
  text(t.subtitle, rtl ? 1152 : 48, 151, 17, muted, 400, undefined, 1104);

  panel(48, 181, 1104, 185, 20, ink);
  const delta = base.metrics.makespanMs > 0
    ? ((base.metrics.makespanMs - candidate.metrics.makespanMs) / base.metrics.makespanMs) * 100
    : 0;
  const deltaLabel = delta > 0 ? t.reduction : delta < 0 ? t.increase : t.same;
  const labels = rtl ? [deltaLabel, t.candidate, t.base] : [t.base, t.candidate, deltaLabel];
  const values = rtl
    ? [`${number(Math.abs(delta))}%`, `${number(candidate.metrics.makespanMs / 1000)} ${t.seconds}`, `${number(base.metrics.makespanMs / 1000)} ${t.seconds}`]
    : [`${number(base.metrics.makespanMs / 1000)} ${t.seconds}`, `${number(candidate.metrics.makespanMs / 1000)} ${t.seconds}`, `${number(Math.abs(delta))}%`];
  for (let i = 0; i < 3; i++) {
    const x = 80 + i * 360;
    const isDelta = rtl ? i === 0 : i === 2;
    text(labels[i], rtl ? x + 298 : x, 222, 13, '#B7CCC2', 600, undefined, 300);
    text(values[i], rtl ? x + 298 : x, 278, 42, isDelta ? delta < 0 ? '#FFCA91' : '#99F1C0' : '#FFFFFF', 700, undefined, 300);
  }
  ctx.fillStyle = '#314B40';
  ctx.fillRect(80, 302, 1040, 1);
  const bottlenecks = `${base.metrics.bottlenecks.join(' + ')} → ${candidate.metrics.bottlenecks.join(' + ')}`;
  text(`${t.bottleneck}: \u2066${bottlenecks}\u2069`, rtl ? 1120 : 80, 338, 16, '#D9E8DF', 500, undefined, 1040);

  settings(rtl ? candidate : base, rtl ? t.candidate : t.base, 48);
  settings(rtl ? base : candidate, rtl ? t.base : t.candidate, 612);
  text(t.assumptions, rtl ? 1152 : 48, 581, 15, muted, 400, undefined, 1104);
  text(t.assumptions2, rtl ? 1152 : 48, 606, 15, muted, 400, undefined, 1104);

  panel(48, 625, 1104, 105, 12, '#E4ECE2');
  text(t.source, rtl ? 1128 : 72, 651, 12, emerald, 700);
  // Wrap the URL as characters: long query strings have no word boundaries.
  // This also preserves the exact copyable experiment parameters on the card.
  ctx.font = `13px ${fontFamily}`;
  const urlText = shareUrl.replace(/[\r\n]+/g, '');
  const lines: string[] = [];
  let line = '';
  for (const char of urlText) {
    if (line && ctx.measureText(line + char).width > 1056) {
      lines.push(line);
      line = char;
    } else line += char;
  }
  if (line) lines.push(line);
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const value = i === 2 && lines.length > 3 ? lines[i].slice(0, -3) + '…' : lines[i];
    text(value, 72, 675 + i * 20, 13, ink, 400, 'ltr', 1056);
  }
  text(t.disclaimer, rtl ? 1152 : 48, 766, 14, muted, 500, undefined, 1104);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG export failed.')), 'image/png');
  });
}

/** Optional download wrapper. Preview generation itself never starts a download. */
export async function exportResultPng(options: ResultCardOptions): Promise<void> {
  const blob = await createResultPng(options);
  downloadBlob(blob, `factory-lab-results-${options.locale}.png`);
}
