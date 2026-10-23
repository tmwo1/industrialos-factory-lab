# A faster machine. A better factory?

[Open the experiment / افتح التجربة](https://industrialos-factory-lab.snappytetra2.chatgpt.site)

## English

**Question:** Does improving any machine improve the whole line equally?

I built IndustrialOS Factory Lab to make this industrial-engineering question visible. Visitors run a deterministic factory model, choose one station, and compare the decision against a baseline in a detailed 3D scene.

Ten pieces enter three stations taking 20, 40 and 25 seconds. Each of the two conveyors adds five seconds, with overlapping transport allowed. The baseline batch finishes at 455 seconds. Halving station A's processing time gives 445 seconds, a 2.2% reduction. Halving station B's gives 300 seconds, a 34.1% reduction, and the capacity constraint moves from B to C.

The lesson is about system constraints: optimizing a local operation does not guarantee the same system-level gain. The theoretical sustained capacity changes from 90 to 144 pieces/hour in the second intervention. Those capacity values are distinct from the output averaged over the finite batch.

The numerical engine is independent of 3D playback. Source inputs, event logs and result cards make the result reviewable. The original procedural equipment illustrates CNC machining, an assembly press and optical inspection. These are synthetic experiments, not measured industrial savings or vendor-certified machine models.

Technology: TypeScript, React, Web Worker, Three.js / React Three Fiber, Vite. Public static hosting, local font assets, no account or database.

## العربية

**السؤال:** هل تحسين أي آلة يعطي الأثر نفسه على خط الإنتاج؟

بنيت IndustrialOS Factory Lab لتوضيح هذا السؤال بصريًا. يشغّل الزائر نموذج مصنع، ويختار محطة واحدة، ثم يقارن القرار بالوضع الأساسي داخل مشهد ثلاثي الأبعاد.

تمر عشر قطع بثلاث محطات أزمنتها 20 و40 و25 ثانية، مع ناقلين بزمن خمس ثوانٍ لكل منهما يسمحان بالنقل المتزامن. تنتهي الدفعة الأساسية في 455 ثانية. خفض زمن A للنصف يجعلها 445 ثانية، بانخفاض 2.2% في زمن إنهاء الدفعة. خفض زمن B للنصف يجعلها 300 ثانية، بانخفاض 34.1% في زمن إنهاء الدفعة، وينقل الاختناق إلى C.

النتيجة توضّح أثر قيود النظام: تحسين جزء منه لا يضمن مقدار التحسن نفسه للنظام كاملًا. الطاقة النظرية المستقرة تتغير من 90 إلى 144 قطعة/ساعة في التحسين الثاني، وهي تختلف عن متوسط إنتاج الدفعة المحدودة.

الحسابات مستقلة عن سرعة الرسومات، ويمكن مراجعة المدخلات وسجل الأحداث وبطاقة النتائج. المعدات مجسمات أصلية مبنية برمجيًا. التجربة تعليمية افتراضية، وليست وفورات مقاسة في مصنع حقيقي أو نموذجًا معتمدًا لمعدات شركة مصنّعة.
