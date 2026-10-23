import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import Download from 'lucide-react/dist/esm/icons/download.js';
import X from 'lucide-react/dist/esm/icons/x.js';
import { createResultPng } from '../exports';
import type { SimulationResult } from '../engine/simulation';
import type { Locale } from '../i18n';

type Props = {
  base: SimulationResult;
  candidate: SimulationResult;
  locale: Locale;
  shareUrl: string;
  onClose: () => void;
};

const copy = {
  ar: {
    title: 'معاينة بطاقة النتائج',
    hint: 'راجع البطاقة، ثم اختر تحميل الصورة لحفظها على جهازك.',
    loading: 'جارٍ تجهيز بطاقة النتائج…',
    failed: 'تعذّر تجهيز البطاقة. حاول مرة أخرى.',
    retry: 'إعادة المحاولة',
    download: 'تحميل الصورة PNG',
    close: 'إغلاق',
    alt: 'بطاقة نتائج محاكاة تعرض إعدادات الخط الأساسي والسيناريو البديل وأزمنة إنهاء الدفعة ونسبة التغيّر.',
  },
  en: {
    title: 'Result card preview',
    hint: 'Review the card, then choose Download image to save it to your device.',
    loading: 'Preparing your result card…',
    failed: 'The card could not be prepared. Please try again.',
    retry: 'Try again',
    download: 'Download image PNG',
    close: 'Close',
    alt: 'Simulation result card showing baseline and candidate settings, batch completion times, and percentage change.',
  },
};

/** A preview only: saving the generated image requires a separate user click. */
export default function ResultCardPreview({ base, candidate, locale, shareUrl, onClose }: Props) {
  const t = copy[locale];
  const titleId = useId();
  const hintId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setUrl('');
    setFailed(false);
    void createResultPng({ base, candidate, locale, shareUrl }).then(blob => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [base, candidate, locale, shareUrl, attempt]);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return <div className="modal-backdrop" onClick={onClose}>
    <section
      className="result-card-preview"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={hintId}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      onClick={event => event.stopPropagation()}
      onKeyDown={onKeyDown}
    >
      <button ref={closeRef} className="modal-close" onClick={onClose} aria-label={t.close}><X size={20}/></button>
      <h2 id={titleId}>{t.title}</h2>
      <p id={hintId}>{t.hint}</p>
      <div className="result-card-image">
        {url ? <img src={url} width={1200} height={800} alt={t.alt}/> : failed ?
          <div role="alert"><p>{t.failed}</p><button className="secondary" onClick={() => setAttempt(value => value + 1)}>{t.retry}</button></div> :
          <p role="status">{t.loading}</p>}
      </div>
      <div className="result-card-actions">
        {url && <a className="primary" href={url} download={`factory-lab-results-${locale}.png`}><Download size={17}/>{t.download}</a>}
        <button className="secondary" onClick={onClose}>{t.close}</button>
      </div>
    </section>
  </div>;
}
