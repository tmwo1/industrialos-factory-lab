# Validation record

Release verification completed on 22 October 2026. This record was consolidated for the GitHub release on 24 October 2026.

**Public application:** https://industrialos-factory-lab.snappytetra2.chatgpt.site

**Publication status:** successfully deployed, audience public. An independent unauthenticated HTTP check returned 200 without a sign-in redirect. All 28 checks passed: HTML, entry script, Three.js chunk, CSS, simulation worker and 23 font files. The published application also rendered in the browser without a login gate.

## Automated verification

The final production source passed 78 tests, strict TypeScript checking and the production build. This GitHub snapshot keeps the same application source and dependency lockfile; changes are limited to repository presentation and documentation.

| Check | Evidence | Result |
|---|---|---|
|Automated suite|73 engine/sharing tests and five CSV-builder tests|Pass|
|Reference scenarios|455 / 445 / 300 seconds, with 5-second transfers|Pass|
|Zero-transfer scenarios|445 / 435 / 290 seconds|Pass|
|One piece|95 seconds, no waiting|Pass|
|Equal station times|20 / 20 / 20 seconds, ten pieces: 250 seconds; all stations constrain capacity|Pass|
|Conservation and flow accounting|35 reproducible generated cases; event-boundary checks, WIP and queue-area identities|Pass|
|Machine capacity and FIFO|No overlapping processing, no starts before arrival, stable service order|Pass|
|Concurrent transport|20 pieces, 1-second stations and 30-second transfers finish in 82 seconds; several pieces may travel simultaneously|Pass|
|Sharing validation|Settings/language round-trip; malformed, duplicate and unsupported-version parameters rejected|Pass|
|Playback-independent calculation|Out-of-order snapshots do not mutate results; repeated simulation is identical|Pass|
|CSV content|UTF-8 BOM and both complete logs, including 180 default event rows|Pass|

## Browser checks completed

- The published 3D scene renders. Reference presets display 445 seconds for A improvement and 300 seconds / 34.1% for B improvement; the capacity constraint changes from B to C.
- Playback reaches 455 seconds with both lines at 10/10 completed and zero work in progress. Keyboard Enter on Next event advances to 20 seconds.
- Invalid batch size zero disables Run and Apply. An invalid model-version URL produces a localized error and the reference example restores successfully.
- Changing language preserves simulation time. A 390 × 844 viewport shows one complete production line; switching baseline/candidate preserves the 20-second position.
- Manual simplified mode preserves the numerical state.
- A fresh public shared URL restores the same numeric settings, language and results at time zero.
- Both Arabic and English result-card previews were visually checked; settings, shaped Arabic text, numbers and percentages were legible.
- No console warnings or errors appeared in the final published-browser check.
- [Actual application screenshot](images/factory-lab.png).

## Limits and outstanding verification

- Automated browser download permission was declined. PNG previews and CSV content generation were verified, but completed PNG/CSV file downloads were not verified.
- A real device without WebGL was not available. Manual simplified mode was checked; this does not prove every graphics-driver failure path.
- No physical-phone GPU benchmark was performed. The narrow viewport check establishes layout only.
- Renderer diagnostics observed 95 draw calls and approximately 30,000 triangles, below the initial 250 / 200,000 geometry budgets. The minified JavaScript total was approximately 1.2 MB and bundled fonts approximately 0.5 MB. No external scene assets are required.
- The development host was Windows, Intel Core i5-1135G7, 8 GB RAM. Incidental frame-rate readings varied with memory pressure; they do not establish sustained 45 FPS desktop or 30 FPS phone targets.
- Rapid worker-response ordering, broader keyboard navigation and reduced-motion behavior were not fully documented as end-to-end browser acceptance checks.

The tests validate this deterministic educational model, not a real factory. The model excludes failures, setups, scrap, finite buffers, collisions and conveyor capacity restrictions.

## العربية

نُشرت النسخة وأُثبت فتحها دون تسجيل دخول. اجتازت 78 اختبارًا مع فحص الأنواع وبناء الإنتاج. الأرقام المرجعية 455 و445 و300 ثانية صحيحة، مع حفظ عدد القطع وترتيب الخدمة والنقل المتزامن. فُحصت الواجهة باللغتين ورابط المشاركة والتخطيط الضيق ومعاينة بطاقتي النتائج.

لم يُختبر اكتمال تنزيل الملفات بسبب رفض إذن التنزيل الآلي، ولم يُقَس أداء معالج الرسومات على هاتف فعلي. النتائج تخص محاكاة تعليمية بأزمنة افتراضية وليست بيانات مصنع حقيقي.
