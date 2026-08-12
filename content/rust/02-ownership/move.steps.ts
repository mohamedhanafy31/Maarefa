/**
 * Lesson 2.2 — الملكية والنقل. The flagship visual.
 *
 * The error in step 6 is VERBATIM from a real run. Captured with:
 *
 *   $ cargo new hello && cd hello
 *   $ cat > src/main.rs   # exactly the `code` string below
 *   $ cargo run
 *
 * rustc 1.97.1 (8bab26f4f 2026-07-14) · cargo 1.97.1 (c980f4866 2026-06-30)
 *
 * Do not touch a character of `note.code` without re-running that. The line
 * numbers and caret columns inside it are tied to the exact source above; edit
 * one and the block silently starts lying.
 *
 * CLAUDE.md, "Quoted compiler output is never load-bearing": at 380px the
 * widest line of this block is 100 columns against a 52-column viewport, so
 * the reader on a phone will not see the end of it without scrolling. The line
 * that gets cut is the most important one in the whole diagnostic —
 *
 *   move occurs because `s1` has type `String`, which does not implement the `Copy` trait
 *
 * — so step 6 states that reason in Arabic, in `explanation` AND in
 * `note.text`, before the block is ever reached.
 */

import type { MemoryVisual } from '../../../src/components/visuals/MemoryStepper/types.ts';

const code = `fn main() {
    let s1 = String::from("hello");
    let s2 = s1;

    println!("{}", s1);
    println!("{}", s2);
}`;

const FIELDS_HELLO = [
  { label: 'ptr', value: '0x5f2a' },
  { label: 'len', value: '5' },
  { label: 'cap', value: '5' },
];

export const visual: MemoryVisual = {
  id: 'ownership-move',
  titleAr: 'إيه اللي بيحصل بالظبط لما تكتب let s2 = s1',
  sequences: [
    {
      id: 'main',
      code,
      rustcVersion: '1.97.1',
      steps: [
        {
          highlight: 1,
          explanation:
            'البرنامج بدأ. الـ frame بتاع main اتفتح وهو فاضي. لسه مفيش أي حاجة على الهيب.',
          frames: [{ id: 'f0', fn: 'main', slots: [], state: 'active' }],
          heap: [],
        },
        {
          highlight: 2,
          explanation:
            's1 اتعمل. القيمة اتقسمت على مكانين: تلات حقول على الستاك (ptr و len و cap)، وحروف كلمة hello نفسها على الهيب.',
          frames: [
            {
              id: 'f0',
              fn: 'main',
              state: 'active',
              slots: [
                {
                  id: 's1',
                  name: 's1',
                  typeName: 'String',
                  state: 'owned',
                  bytes: 24,
                  pointsTo: 'h1',
                  fields: FIELDS_HELLO.map((f) => ({ ...f, changed: true })),
                },
              ],
            },
          ],
          heap: [
            {
              id: 'h1',
              cells: ['h', 'e', 'l', 'l', 'o'],
              capacity: 5,
              state: 'alive',
              label: 'String data',
              bytes: 5,
            },
          ],
        },
        {
          highlight: 2,
          explanation:
            'المهم إن s1 هو المالك. مش بس بيشاور على البايتات دي — هو المسؤول عن تحريرها. الكومبايلر عارف إن لما s1 يخلص، البايتات دي بترجع للنظام.',
          frames: [
            {
              id: 'f0',
              fn: 'main',
              state: 'active',
              slots: [
                {
                  id: 's1',
                  name: 's1',
                  typeName: 'String',
                  state: 'owned',
                  bytes: 24,
                  pointsTo: 'h1',
                  fields: FIELDS_HELLO,
                },
              ],
            },
          ],
          heap: [
            {
              id: 'h1',
              cells: ['h', 'e', 'l', 'l', 'o'],
              capacity: 5,
              state: 'alive',
              label: 'String data',
              bytes: 5,
            },
          ],
          note: {
            kind: 'insight',
            text: 'الملكية مش تشبيه. هي حقيقة عن الكود المترجم: فيه أمر تحرير واحد بس هيتنفذ، ومربوط بـ s1 تحديداً.',
          },
        },
        {
          highlight: 3,
          explanation:
            'النقل حصل هنا. التلات حقول اتنسخوا من s1 لـ s2 — 24 بايت بس. الحروف اللي على الهيب مالمستش خالص، ومحدش عمل نسخة تانية منها.',
          frames: [
            {
              id: 'f0',
              fn: 'main',
              state: 'active',
              slots: [
                {
                  id: 's1',
                  name: 's1',
                  typeName: 'String',
                  state: 'moved',
                  bytes: 24,
                  fields: FIELDS_HELLO,
                },
                {
                  id: 's2',
                  name: 's2',
                  typeName: 'String',
                  state: 'owned',
                  bytes: 24,
                  pointsTo: 'h1',
                  fields: FIELDS_HELLO.map((f) => ({ ...f, changed: true })),
                },
              ],
            },
          ],
          heap: [
            {
              id: 'h1',
              cells: ['h', 'e', 'l', 'l', 'o'],
              capacity: 5,
              state: 'alive',
              label: 'String data',
              bytes: 5,
            },
          ],
          note: {
            kind: 'insight',
            text: 'خد بالك إن مفيش سهم خارج من s1 دلوقتي. الحقول لسه مكتوبة جواه، بس هو مبقاش مالك حاجة — وده الفرق اللي الكومبايلر شايفه.',
          },
        },
        {
          highlight: 3,
          explanation:
            'ليه s1 اتشال بدل ما الاتنين يفضلوا شغالين؟ لأن الاتنين ساعتها هيبقى فيهم نفس العنوان، ولما الدالة تخلص كل واحد فيهم هيحرر نفس البايتات — تحرير مرتين، وده من أخطر أخطاء C.',
          frames: [
            {
              id: 'f0',
              fn: 'main',
              state: 'active',
              slots: [
                {
                  id: 's1',
                  name: 's1',
                  typeName: 'String',
                  state: 'moved',
                  bytes: 24,
                  fields: FIELDS_HELLO,
                },
                {
                  id: 's2',
                  name: 's2',
                  typeName: 'String',
                  state: 'owned',
                  bytes: 24,
                  pointsTo: 'h1',
                  fields: FIELDS_HELLO,
                },
              ],
            },
          ],
          heap: [
            {
              id: 'h1',
              cells: ['h', 'e', 'l', 'l', 'o'],
              capacity: 5,
              state: 'alive',
              label: 'String data',
              bytes: 5,
            },
          ],
          note: {
            kind: 'warning',
            text: 'الحل التاني كان نسخ الحروف كلها للـ s2 — بس ساعتها كل إسناد بسيط يبقى عملية نسخ مكلفة من ورا ظهرك. Rust اختارت تنقل الملكية بدل النسخ، وتقولك إنها عملت كده.',
          },
        },
        {
          highlight: 5,
          explanation:
            'هنا الكومبايلر بيرفض. السبب المكتوب في رسالة الخطأ إن النقل حصل أصلاً لأن نوع s1 هو String، والنوع ده مش بيطبّق الـ Copy trait — يعني إسناده بينقل الملكية ومش بينسخ. عشان كده s1 مبقاش صالح للاستخدام بعد سطر 3.',
          frames: [
            {
              id: 'f0',
              fn: 'main',
              state: 'active',
              slots: [
                {
                  id: 's1',
                  name: 's1',
                  typeName: 'String',
                  state: 'moved',
                  bytes: 24,
                  fields: FIELDS_HELLO,
                },
                {
                  id: 's2',
                  name: 's2',
                  typeName: 'String',
                  state: 'owned',
                  bytes: 24,
                  pointsTo: 'h1',
                  fields: FIELDS_HELLO,
                },
              ],
            },
          ],
          heap: [
            {
              id: 'h1',
              cells: ['h', 'e', 'l', 'l', 'o'],
              capacity: 5,
              state: 'alive',
              label: 'String data',
              bytes: 5,
            },
          ],
          conflict: {
            slots: ['s1'],
            // The Arabic above and below says everything the block says. The
            // block is here for authenticity and for search — a learner who
            // never scrolls it has already been told the reason.
            message:
              'الرسالة بتقول بالحرف: النقل حصل لأن s1 نوعه String، والنوع ده مش بيطبّق الـ Copy trait. السطر ده هو أهم سطر في رسالة الخطأ كلها — هو السبب، مش النتيجة. وبعدين بتقولك إن القيمة اتنقلت في سطر 3، وإنك بتحاول تستعيرها في سطر 5 بعد ما اتنقلت.',
            code: `error[E0382]: borrow of moved value: \`s1\`
 --> src/main.rs:5:20
  |
2 |     let s1 = String::from("hello");
  |         -- move occurs because \`s1\` has type \`String\`, which does not implement the \`Copy\` trait
3 |     let s2 = s1;
  |              -- value moved here
4 |
5 |     println!("{}", s1);
  |                    ^^ value borrowed here after move
  |
help: consider cloning the value if the performance cost is acceptable
  |
3 |     let s2 = s1.clone();
  |                ++++++++`,
          },
        },
        {
          highlight: 7,
          explanation:
            'ولو شيلنا سطر 5، البرنامج بيشتغل وبيوصل هنا. s2 بس هو اللي بيحرر البايتات، مرة واحدة. s1 مش بيعمل حاجة — مكانش عنده حاجة يحررها من ساعة النقل.',
          frames: [
            {
              id: 'f0',
              fn: 'main',
              state: 'returning',
              slots: [
                {
                  id: 's1',
                  name: 's1',
                  typeName: 'String',
                  state: 'moved',
                  bytes: 24,
                  fields: FIELDS_HELLO,
                },
                {
                  id: 's2',
                  name: 's2',
                  typeName: 'String',
                  state: 'dropped',
                  bytes: 24,
                  fields: FIELDS_HELLO,
                },
              ],
            },
          ],
          heap: [
            {
              id: 'h1',
              cells: ['h', 'e', 'l', 'l', 'o'],
              capacity: 5,
              state: 'freed',
              label: 'String data',
              bytes: 5,
            },
          ],
          note: {
            kind: 'insight',
            text: 'ده كل الموضوع: مالك واحد في كل لحظة، فتحرير واحد بالظبط. الكومبايلر بيرفض كل كود مش قادر يضمن فيه الجملة دي.',
          },
        },
      ],
    },
  ],
};
