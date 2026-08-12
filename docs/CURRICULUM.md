# Maarefa — Curriculum & Brand (v4)

**Maarefa** (معرفة) · Arabic Technical Knowledge
*Learn what happens beneath the code.*

Supersedes the curriculum section of the earlier spec. Architecture, admin page, and analytics sections of `SITE_SPEC.md` remain valid. Visual specifications live in `VISUALS.md`.

**v4 changes:** renamed from Fikra to Maarefa · 1.1–1.3 are new writing, not adaptations · lesson 1.4 moved to leave period 2 · launch scope is 9 lessons.

---

## 1. Brand

The name is broad and the tagline is sharp — a good pairing. "Maarefa" (معرفة — knowledge) doesn't box the site into Rust, which matters when CUDA and other tracks arrive. **"Learn what happens beneath the code"** does the positioning work: it promises mechanism, not syntax, and that promise is exactly what the visual and assembly layers deliver.

The name is settled. The repo is `maarefa`. Domain is tracked separately; every reference in the codebase goes through a single `SITE_URL` constant so nothing else depends on it.

**Voice:** Egyptian Arabic, teaching rather than restating documentation. Explain *why* the language works this way, not only what the rule is. English for identifiers, code, and error messages — never translate them.

**Author identity:** the About page carries a real name, background, and what the author actually builds. For technical content this raises credibility substantially, and it is the mechanism by which the site converts into professional reputation.

---

## 2. Curriculum — Rust track

**28 lessons across 6 modules.** Legend: ✅ written · 🔨 launch scope · ⬜ later

---

### Module 0 — البداية (Getting Started)

The site begins at zero: nothing installed, no assumptions. Most Arabic Rust content skips setup, which is precisely where beginners get stuck and quit.

**This module does something no tutorial does: it pre-empts the exact failures documented in `/problems`.** Each setup lesson carries inline warnings at the moment the failure would occur, linking to the full problem page. That design turns the troubleshooting library from an appendix into an integrated part of the curriculum.

| # | Lesson | Contents |
|---|---|---|
| 0.1 🔨 | **ليه Rust؟ وإيه اللي هتتعلمه** | What Rust is for; the problems it solves (memory safety without GC); who uses it; honest note on the learning curve; a preview of where the track ends. Short — 5 minutes. Sets the destination. |
| 0.2 🔨 | **تثبيت Rust** | `rustup` on Linux/macOS/Windows (WSL noted); what rustup actually installs (`rustc`, `cargo`, `rustup`); verifying with `rustc --version` and `cargo --version`; what the `~/.cargo` directory is; updating and uninstalling. |
| 0.3 🔨 | **تجهيز بيئة العمل** | VS Code + `rust-analyzer`; **⚠ rust-analyzer needs `Cargo.toml` at the workspace root** — the workspace approach explained; **⚠ GUI-launched VS Code doesn't inherit `~/.cargo/bin`** — launch with `code .` from the terminal; recommended settings; format-on-save with `rustfmt`. |
| 0.4 🔨 | **أول برنامج** | `cargo new hello`; project structure walkthrough; `Cargo.toml` anatomy; `cargo run`, `cargo build`, `cargo check` and when each is used; **⚠ where the binary actually is — `target/debug/hello`, and on Linux it has no extension**; `println!` as a first taste. |

Three of the five launch problem pages are referenced directly from this module.

---

### Module 1 — الأساسيات (Foundations)

| # | Lesson | Teaches | Visual | Code |
|---|---|---|---|---|
| 1.1 🔨 | المتغيرات والقابلية للتغيير | `let`, `mut`, shadowing, `const` | shadowing vs mutation, two panels | runnable |
| 1.2 🔨 | أنواع البيانات | scalars, tuples, arrays, overflow behaviour | integer ranges to scale | runnable |
| 1.3 🔨 | الدوال | parameters, returns, **expression vs statement** | semicolon traced as the difference | runnable |
| 1.4 ⬜ | التحكم في المسار | `if` as expression, `loop`/`while`/`for`, `break` with value | static SVG at launch of period 2; `FlowDiagram` in period 3 | runnable |

**All of 1.1–1.3 are written from scratch.** Earlier PDF drafts are personal study notes structured around someone else's video course; they are deliberately not a source and nothing carries over from them. This curriculum's own pedagogy is the sole structural authority — the ordering here diverges from typical course ordering on purpose, most visibly in placing ownership at module 2.

**1.4 moved to leave period 2.** Its specified visual was `FlowDiagram`, a component not scheduled until period 3, which would have put a second component on the launch critical path. Control flow is not a prerequisite for ownership, so the launch arc "nothing installed → ownership" survives intact. If `MemoryStepper` lands early, 1.4 is the first thing to add back.

---

### Module 2 — الملكية (Ownership) — flagship module

| # | Lesson | Teaches | Visual | Code |
|---|---|---|---|---|
| 2.1 🔨 | الستاك والهيب | the memory model everything else depends on | **`MemoryStepper`** ⭐ | plain |
| 2.2 🔨 | الملكية والنقل | ownership rules, move semantics, drop | **`MemoryStepper`** ⭐⭐ flagship | runnable |
| 2.3 ⬜ | الاستعارة | `&T`, borrow scope, why borrowing exists | `MemoryStepper` + borrow counter | runnable |
| 2.4 ⬜ | الاستعارة القابلة للتغيير | `&mut T`, exclusivity, data-race prevention | `MemoryStepper`, legal/illegal | runnable |
| 2.5 ⬜ | الشرائح | `&str`, `&[T]`, pointer + length | `MemoryStepper` window rendering | runnable |

---

### Module 3 — البنى (Structuring Data)

| # | Lesson | Teaches | Visual |
|---|---|---|---|
| 3.1 ⬜ | الـ Structs | definition, methods, `impl` | field layout + padding |
| 3.2 ⬜ | الـ Enums | variants carrying data | discriminant + payload |
| 3.3 ⬜ | مطابقة الأنماط | `match`, exhaustiveness, guards | `FlowDiagram`, interactive |
| 3.4 ⬜ | `Option` | null safety without null | niche optimisation |
| 3.5 ⬜ | `Result` ومعالجة الأخطاء | `Result`, `?`, propagation | `FlowDiagram` |

---

### Module 4 — التجريد (Generics, Traits, Lifetimes)

| # | Lesson | Teaches | Visual | Code |
|---|---|---|---|---|
| 4.1 ⬜ | الأنواع العامة | generics, monomorphisation | expansion diagram | **showAsm** |
| 4.2 ⬜ | السمات | traits, defaults, bounds | trait/impl map | runnable |
| 4.3 ⬜ | دورات الحياة | lifetimes, elision, why they exist | **`LifetimeTimeline`** ⭐ | runnable |
| 4.4 ⬜ | الإرسال الساكن مقابل الديناميكي | `impl Trait` vs `dyn Trait`, vtables | vtable + asm | **showAsm** ⭐ |

---

### Module 5 — Rust عملي (Practical Rust)

| # | Lesson | Teaches | Visual | Code |
|---|---|---|---|---|
| 5.1 ⬜ | المجموعات | `Vec`, `HashMap`, `String` | `MemoryStepper` — Vec growth | runnable |
| 5.2 ⬜ | أنماط معالجة الأخطاء | custom errors, `From`, `?` chains | — | runnable |
| 5.3 ⬜ | الوحدات والحزم | `mod`, visibility, crates | module tree | plain |
| 5.4 ⬜ | الاختبارات | `#[test]`, organisation | — | runnable |
| 5.5 ⬜ | التجريدات صفرية التكلفة | iterator chain vs manual loop | — | **showAsm** ⭐⭐ |

---

## 3. Launch scope (leave period 1)

**9 lessons:**

```
Module 0   0.1  0.2  0.3  0.4        ← all new, all setup
Module 1   1.1  1.2  1.3             ← all new; 1.4 deferred to period 2
Module 2   2.1  2.2                  ← both new, both flagship visuals
```

**Build effort:**
- 9 lessons written from scratch — none adapted
- 1 component (`MemoryStepper`) + 2 stepper visuals
- 4 static SVGs (0.4, 1.1, 1.2, 1.3)
- 5 problem pages (all already solved)

Launch succeeds on exactly two things: **the site is live on the real domain, and mixed-direction rendering is correct at 380px.** Everything else can slip a task. If something has to give, give up polish and keep the deploy.

This is a complete arc: a learner arriving with nothing installed can reach a working understanding of ownership — the concept that decides whether someone continues with Rust or abandons it. **That is a genuinely useful destination**, not a partial course.

Modules 3–5 are outlined publicly on `/rust` as "قادم قريباً" so the shape of the whole track is visible from day one.

---

## 4. Lesson page structure

Every lesson follows the same seven-part shape. Consistency is what makes it feel like a course rather than a blog.

1. **اللي هتفهمه** — 2–3 concrete bullets
2. **الشرح** — Egyptian Arabic prose, teaching not restating
3. **المرئي** — the visual
4. **الكود** — annotated, runnable where output is the point
5. **ليه بيشتغل كده** — the mechanical reason
6. **تمرين** — with a collapsible solution
7. **مشاكل شائعة** — links into `/problems`, then the lesson's Giscus thread

Prev/next at the bottom, module progress at the top.

---

## 5. Problems library — launch entries

| Slug | Referenced from |
|---|---|
| `linux-binary-no-extension` | 0.4 |
| `rust-analyzer-not-working` | 0.3 |
| `cargo-command-not-found-vscode` | 0.3 |
| `borrow-checker-first-errors` | 2.2 |
| `string-vs-str-mismatch` | 2.1 |

Each entry: verbatim symptom → cause → fix → why it happens → related lesson.

Verbatim error strings are the SEO asset — people paste error text into search, and Arabic competition for those queries is close to zero.

---

## 6. Confirmed decisions

| Question | Decision |
|---|---|
| Name | **Maarefa** (معرفة) — Arabic Technical Knowledge |
| Tagline | Learn what happens beneath the code. |
| Repo | `maarefa`. **Single** public repo, Discussions enabled, Giscus on the same repo |
| Lesson order | Independent pedagogical order (ownership early), not video-series order |
| Starting point | From installation — Module 0 |
| Author identity | Real name and background on About page |
| Exercises | Included from launch (part of the lesson template) |
| Launch scope | 9 lessons, all new writing; 1.4 in period 2 |
| Slugs | Latin transliteration, **unnumbered**; order lives in frontmatter |
| Numerals | Western 0-9 everywhere, stepper controls included |
| Code execution | Link-out to play.rust-lang.org only at launch; inline in period 2 |
| Progress display | Static build-time position indicator; no tracking |
| CUDA | Deferred |
| `/playground` | **Dropped** — thin page, and lessons link out where the code is |
