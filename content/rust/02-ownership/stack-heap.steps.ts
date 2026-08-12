/**
 * Lesson 2.1 — الستاك والهيب
 *
 * Every number here came from a real run, not from reasoning:
 *
 *   $ cargo run          # rustc 1.97.1 (8bab26f4f 2026-07-14)
 *   i32    = 4 bytes
 *   String = 24 bytes
 *   usize  = 8 bytes
 *   len = 2, capacity = 2      // for String::from("hi")
 *
 * The addresses are representative, not captured: a real address changes on
 * every run and on every machine, and the lesson says so in prose.
 */

import type { MemoryVisual } from '../../../src/components/visuals/MemoryStepper/types.ts';

const code = `fn main() {
    let x = 5;
    let s = String::from("hi");

    println!("{x} {s}");
}`;

export const visual: MemoryVisual = {
  id: 'stack-heap',
  titleAr: 'قيمة على الستاك، وقيمة على الهيب',
  sequences: [
    {
      id: 'main',
      code,
      rustcVersion: '1.97.1',
      steps: [
        {
          highlight: 1,
          explanation:
            'البرنامج بدأ. الـ frame بتاع main اتفتح على الستاك وهو لسه فاضي — ده الشريط اللي هيتحط فيه كل متغير محلي في الدالة دي.',
          frames: [{ id: 'f0', fn: 'main', slots: [], state: 'active' }],
          heap: [],
        },
        {
          highlight: 2,
          explanation:
            'x اتحط على الستاك. حجمه معروف وقت الترجمة — 4 بايت لنوع i32 — فالقيمة 5 نفسها قاعدة جوه الـ frame، مفيش أي حاجة تانية في أي مكان تاني.',
          frames: [
            {
              id: 'f0',
              fn: 'main',
              state: 'active',
              slots: [
                { id: 'x', name: 'x', typeName: 'i32', state: 'owned', value: '5', bytes: 4 },
              ],
            },
          ],
          heap: [],
          note: {
            kind: 'insight',
            text: 'الستاك سريع عشان الترتيب فيه بسيط: كل حاجة بتتحط فوق بعضها وبتتشال بنفس الترتيب بالعكس. ده ممكن بس لما الحجم يكون معروف من وقت الترجمة.',
          },
        },
        {
          highlight: 3,
          explanation:
            's نوعه String، والنص اللي جواه ممكن يكبر وقت التشغيل — فحجمه مش معروف وقت الترجمة. عشان كده اللي بيتحط على الستاك مش النص، دول تلات حقول بس بحجم ثابت 24 بايت: ptr و len و cap.',
          frames: [
            {
              id: 'f0',
              fn: 'main',
              state: 'active',
              slots: [
                { id: 'x', name: 'x', typeName: 'i32', state: 'owned', value: '5', bytes: 4 },
                {
                  id: 's',
                  name: 's',
                  typeName: 'String',
                  state: 'owned',
                  bytes: 24,
                  pointsTo: 'h1',
                  fields: [
                    { label: 'ptr', value: '0x5f2a', changed: true },
                    { label: 'len', value: '2', changed: true },
                    { label: 'cap', value: '2', changed: true },
                  ],
                },
              ],
            },
          ],
          heap: [
            { id: 'h1', cells: ['h', 'i'], capacity: 2, state: 'alive', label: 'String data', bytes: 2 },
          ],
          note: {
            kind: 'insight',
            text: 'النص "hi" نفسه راح للهيب. ptr هو العنوان اللي بيوصلك له، len عدد البايتات المستعملة، cap المساحة المحجوزة كلها.',
          },
        },
        {
          highlight: 5,
          explanation:
            'لما بتقرأ x الجهاز بيلاقي القيمة في نفس المكان على طول. لما بتقرأ s لازم يقرأ ptr الأول، وبعدين يروح للعنوان ده في الهيب. قفزة زيادة — دي التكلفة الحقيقية للهيب.',
          frames: [
            {
              id: 'f0',
              fn: 'main',
              state: 'active',
              slots: [
                { id: 'x', name: 'x', typeName: 'i32', state: 'owned', value: '5', bytes: 4 },
                {
                  id: 's',
                  name: 's',
                  typeName: 'String',
                  state: 'owned',
                  bytes: 24,
                  pointsTo: 'h1',
                  fields: [
                    { label: 'ptr', value: '0x5f2a' },
                    { label: 'len', value: '2' },
                    { label: 'cap', value: '2' },
                  ],
                },
              ],
            },
          ],
          heap: [
            { id: 'h1', cells: ['h', 'i'], capacity: 2, state: 'alive', label: 'String data', bytes: 2 },
          ],
        },
        {
          highlight: 6,
          explanation:
            'الأقواس اتقفلت. x بيختفي مع الـ frame من غير أي شغل إضافي. أما s فالكومبايلر حط له أمر تحرير هنا وقت الترجمة، فالبايتين اللي على الهيب رجعوا للنظام في اللحظة دي بالظبط.',
          frames: [
            {
              id: 'f0',
              fn: 'main',
              state: 'returning',
              slots: [
                { id: 'x', name: 'x', typeName: 'i32', state: 'dropped', value: '5', bytes: 4 },
                {
                  id: 's',
                  name: 's',
                  typeName: 'String',
                  state: 'dropped',
                  bytes: 24,
                  fields: [
                    { label: 'ptr', value: '0x5f2a' },
                    { label: 'len', value: '2' },
                    { label: 'cap', value: '2' },
                  ],
                },
              ],
            },
          ],
          heap: [
            { id: 'h1', cells: ['h', 'i'], capacity: 2, state: 'freed', label: 'String data', bytes: 2 },
          ],
          note: {
            kind: 'insight',
            text: 'محدش كتب free ومفيش garbage collector اشتغل. الكومبايلر عرف من الكود نفسه إن ده آخر مكان s موجود فيه، وحط أمر التحرير هناك وهو بيترجم.',
          },
        },
      ],
    },
  ],
};
