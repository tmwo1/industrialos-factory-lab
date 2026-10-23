# Model 1 — deterministic serial production line

## Assumptions / الافتراضات

One product, three stations A→B→C, one machine per station, FIFO, all pieces released at zero. Processing times are positive whole seconds (1–300). Batch size is 1–200. Each conveyor delay is 0–30 whole seconds; pieces can travel concurrently, with no conveyor capacity or blocking. Waiting buffers are unlimited.

منتج واحد وثلاث محطات بالترتيب A ثم B ثم C، وآلة واحدة لكل محطة تخدم القطع بأسبقية الوصول. حجم الدفعة من 1 إلى 200 قطعة، وزمن كل محطة من 1 إلى 300 ثانية صحيحة، وزمن كل ناقل من 0 إلى 30 ثانية صحيحة. كل القطع متاحة عند الزمن صفر. يسمح النقل بوجود عدة قطع في الوقت نفسه، وسعة الانتظار غير محدودة. لا أعطال أو إعداد أو خردة أو تصادمات فيزيائية.

## Computation

For piece j at station s:

```
arrival[j,0] = 0
arrival[j,s] = finish[j,s−1] + transfer[s−1]
start[j,s] = max(arrival[j,s], finish[j−1,s])
finish[j,s] = start[j,s] + processing[s]
waiting[j,s] = start[j,s] − arrival[j,s]
```

The previous-piece finish constraint is zero for the first piece. Times are stored in integer milliseconds. Tied events are ordered: finish, arrival, start; then station A/B/C and piece ID. Snapshots represent the stable state after all events at a timestamp. Processing and transport intervals are half-open `[start,end)`.

لكل قطعة: الوصول هو نهاية المحطة السابقة مضافًا إليه النقل؛ والبدء هو الأبعد بين الوصول وتفرّغ الآلة؛ والانتهاء هو البدء مضافًا إليه زمن المعالجة. الانتظار هو الفرق بين البدء والوصول. عند تساوي الزمن تُرتّب الأحداث: انتهاء، ثم وصول، ثم بدء؛ وتُمثّل لقطة العرض الحالة المستقرة بعد جميع أحداث تلك اللحظة.

The closed-form batch check under these assumptions is:

`makespan = sum(processing) + sum(transport) + (N−1) × max(processing)`.

## Measures

- Batch completion: departure of the final piece.
- Flow time: departure minus release; average across pieces.
- Waiting: flow minus processing minus transport.
- Work in progress: waiting + processing + in transit, including the initial input queue.
- Batch rate: completed pieces × 3600 / batch seconds.
- Theoretical sustained capacity: 3600 / maximum processing seconds; assumes continuous supply and the unconstrained transport of this model.
- Utilization: N × station processing time / that run's makespan. It is a ratio 0–1 internally.
- Bottleneck: all stations tied for the largest processing time. Queue length alone is not the definition.

زمن إنهاء الدفعة هو وقت خروج آخر قطعة. متوسط الانتظار لا يشمل المعالجة أو النقل. القطع تحت التشغيل تشمل المنتظرة والمعالجة والمنقولة، بما فيها الطابور الأولي. استغلال المحطة يُحسب بقسمة انشغالها على زمن إنهاء تجربتها. معدل الدفعة يختلف عن الطاقة النظرية المستقرة؛ وتُعرض جميع المحطات المتساوية في أطول زمن معالجة بوصفها محددة للطاقة.

The chart uses the same absolute time axis for both runs. Do not compare average WIP over unequal windows as if the window were identical. A 34.1% time reduction is not a 34.1% output increase.

## Reference results

| Processing (s) | Transfers (s) | N | Makespan (s) | Mean wait (s) | Capacity (/h) |
|---|---|---:|---:|---:|---:|
|20/40/25|5/5|10|455|180|90|
|10/40/25|5/5|10|445|180|90|
|20/20/25|5/5|10|300|112.5|144|
|20/40/25|0/0|10|445|180|90|
|10/40/25|0/0|10|435|180|90|
|20/20/25|0/0|10|290|112.5|144|
|20/40/25|5/5|1|95|0|90|
|20/20/20|5/5|10|250|90|180|

These values are model outcomes. CNC, press and camera cycle times are illustrative, not vendor specifications or validation of an actual manufacturing process.

## Reproducible sharing

Versioned query parameters: `v,n,a,b,c,ab,bc,target,new,lang`. Only validated numeric settings and locale are shared; results are recomputed. Invalid or duplicate parameters display an error. Input edits pause playback and disable exporting until applied. Worker responses are matched by runId so obsolete calculations are discarded.

## Exports / التصدير

The PNG card records both configurations, batch times, the percentage change in batch completion time, the capacity-limiting stations, model assumptions, the experiment URL and an educational-simulation label. It does not certify industrial savings.

The result card opens in an in-app preview with an explicit download button. Download completion depends on browser permissions; a successful preview or content test is not evidence that a file was saved.

The CSV contains both complete event logs, grouped by scenario and ordered by the deterministic sequence within each run. Columns are scenario, sequence, seconds, piece ID, station and event type. A UTF-8 byte-order mark supports Arabic text in spreadsheet applications. The default ten-piece comparison produces 180 event rows plus one header row.

تتضمن بطاقة PNG إعدادات التجربتين والنتائج ونسبة التغير في زمن إنهاء الدفعة والافتراضات ورابط إعادة التجربة وعبارة توضح أنها محاكاة تعليمية. ويضم CSV سجلي الأحداث كاملين، مع اسم السيناريو والترتيب والزمن ورقم القطعة والمحطة ونوع الحدث. في المثال الافتراضي يوجد 180 صف أحداث وصف عناوين واحد.

تُفتح البطاقة في معاينة داخل التطبيق وبها زر تنزيل. اكتمال حفظ الملف يعتمد على إذن المتصفح؛ ظهور المعاينة أو نجاح اختبار المحتوى لا يثبت أن الملف حُفظ على الجهاز.
