# Fikra — Visual System Specification

The visuals are the product. Everything else on the site exists elsewhere in some form; the memory visualisations do not exist in Arabic at all.

This document defines how they are designed, built, and authored.

---

## 1. Governing principles

**A visual must show something prose cannot.** Spatial relationships, state changing over time, or structure. If a sentence conveys it, write the sentence. Decorative diagrams are worse than none — they add weight and imply depth that isn't there.

**One visual language across the whole site.** A box that means "heap allocation" in lesson 2.1 means exactly that in lesson 5.1. Consistency is what turns a set of diagrams into a system the learner internalises.

**Author data, not components.** The expensive mistake would be hand-building 23 bespoke visuals. Instead: build **four** components, and author each visual as a data array. Adding a visual then costs an hour of writing, not a day of coding.

---

## 2. The visual vocabulary

Every memory visual uses these primitives. Nothing else.

### 2.1 Regions

| Region | Rendering |
|---|---|
| **Stack** | Vertical column, frames stacked. Each frame labelled with its function name. Grows downward visually. |
| **Heap** | Separate region, right side (LTR panel). Free-floating blocks, rounded corners. |
| **Static/binary** | Small region, only shown when relevant (string literals, constants). |

The two regions are visually distinct in shape, not just position: **stack slots are sharp rectangles, heap blocks are rounded.** A learner glancing at any diagram knows immediately which is which.

### 2.2 Value states

| State | Rendering | Meaning |
|---|---|---|
| `owned` | Solid border, full opacity, accent colour | This binding owns the value |
| `borrowed` | Solid border, blue tint, thin arrow from borrower | Immutably borrowed |
| `borrowed_mut` | Solid border, amber tint, thick arrow | Mutably borrowed — exclusive |
| `moved` | Dashed border, 40% opacity, diagonal hatch fill | Value moved out; binding invalid |
| `dropped` | Fading out, then removed | Scope ended, memory freed |
| `uninitialised` | Dotted border, empty | Declared but not yet assigned |

**Colour is never the only signal.** Every state also differs in border style and opacity, so the visuals work for colour-blind learners and in print.

### 2.3 Connections

| Element | Rendering |
|---|---|
| **Pointer** | Solid arrow, stack slot → heap block |
| **Borrow** | Dashed arrow, borrower → owner |
| **Invalid pointer** | Red arrow ending in an ✕ (dangling case, lifetimes lesson) |

### 2.4 Composite values

Rust types that aren't a single word are always drawn decomposed. `String` is the canonical example, and drawing it correctly the first time prevents months of confusion:

```
Stack                          Heap
┌─────────────┐
│ s1          │
│ ptr  ────────────────────→   ┌───┬───┬───┬───┬───┐
│ len  5      │                │ h │ e │ l │ l │ o │
│ cap  5      │                └───┴───┴───┴───┴───┘
└─────────────┘
```

The learner sees that `String` is three machine words on the stack pointing at heap bytes. Once this image exists, move semantics become obvious rather than magical.

---

## 3. The four components

### 3.1 `MemoryStepper` — the workhorse

Covers module 2 entirely, plus `Vec` growth and struct layout. **This one component carries roughly seven visuals.** Build it well; everything else is cheaper.

**Layout (desktop):**

```
┌────────────────────────┬─────────────────────────┐
│  Code (LTR, mono)      │  Memory                 │
│  ─────────────────     │  ┌────────┐  ┌───────┐  │
│  1  fn main() {        │  │ Stack  │  │ Heap  │  │
│  2    let s1 = ...     │  │        │  │       │  │
│▸ 3    let s2 = s1;     │  │        │  │       │  │
│  4  }                  │  └────────┘  └───────┘  │
├────────────────────────┴─────────────────────────┤
│  الشرح للخطوة الحالية (RTL)                       │
├──────────────────────────────────────────────────┤
│  [◀ السابق]      الخطوة ٣ / ٧      [التالي ▶]     │
└──────────────────────────────────────────────────┘
```

**Layout (mobile, ≤ 640px):** panels stack vertically — code, then memory, then explanation, then controls. Controls are fixed at the bottom of the component with ≥ 44px touch targets. **Test this at 380px before considering the component done.**

**Data format:**

```ts
type Step = {
  codeLine: number;              // 1-indexed, highlighted
  explanation: string;           // Arabic, 1–3 sentences
  stack: StackSlot[];
  heap: HeapBlock[];
  note?: 'error' | 'insight';    // renders a callout
};

type StackSlot = {
  id: string;
  name: string;                  // 's1'
  frame: string;                 // 'main'
  fields?: { label: string; value: string }[];  // ptr/len/cap
  pointsTo?: string;             // heap block id
  state: 'owned' | 'borrowed' | 'borrowed_mut'
       | 'moved' | 'dropped' | 'uninitialised';
  borrows?: { from: string; kind: 'shared' | 'mut' }[];
};

type HeapBlock = {
  id: string;
  cells: string[];               // ['h','e','l','l','o']
  capacity?: number;             // shows unused capacity slots
  state: 'alive' | 'freed';
};
```

Authoring a new visual = writing an array of `Step`. No new code.

**Transitions:** animate SVG attribute changes (`x`, `y`, `opacity`, `stroke-dasharray`) with CSS transitions, ~250ms. The animation is pedagogical — the learner should *see* the pointer move rather than find a new diagram. Respect `prefers-reduced-motion` by disabling transitions.

**Interaction:** next / previous buttons, arrow-key support, swipe on touch. No autoplay — the learner controls the pace.

### 3.2 `LifetimeTimeline`

For lesson 4.3. Horizontal bars showing scope extents against a shared time axis.

```
        │ 1   2   3   4   5   6   7
   x    │ ├───────────────────────┤
   r    │     ├───────────┤
   y    │         ├───┤
        │              ↑ y dropped here — r would dangle
```

Data: `{ name, start, end, kind: 'owner' | 'borrow' }[]` plus optional violation markers. The dangling case renders the borrow bar extending past the owner's end, marked in red.

### 3.3 `FlowDiagram`

For `match`, `Option`, `Result`, and control flow. A value enters at the top and flows down through branches; the taken path highlights, the others dim.

Data: `{ input, branches: [{ pattern, taken, result }] }`.

Interactive variant: the learner changes the input value and watches which arm captures it. This is the single best way to teach exhaustiveness.

### 3.4 Static SVG

Everything else — project tree diagrams, trait/impl maps, integer range charts, module trees, vtable layouts. Hand-authored, inlined into the page, no JavaScript.

**Rule:** if it doesn't change state, it is static SVG. Do not reach for a component.

---

## 4. Per-lesson visual specifications

### 0.4 — أول برنامج: project structure
**Static SVG.** Directory tree with annotations: what `Cargo.toml` is, what `src/main.rs` is, where `target/debug/<name>` appears after build, and that on Linux **the binary has no extension**. Links to the corresponding problem page.

### 1.1 — المتغيرات: shadowing vs mutation
**Static SVG, two panels.** Left: `mut` — one slot, value overwritten. Right: shadowing — two distinct slots, the first still existing but inaccessible. Most learners conflate these; the side-by-side kills the confusion in one look.

### 1.2 — أنواع البيانات: integer ranges
**Static SVG.** Number line with `i8`/`i16`/`i32`/`i64` ranges drawn to scale (log axis), showing where overflow happens. Annotate the debug-vs-release overflow behaviour difference.

### 1.3 — الدوال: expression vs statement
**Static SVG.** Two code fragments, one with a trailing semicolon and one without, with the return value traced out of each. The semicolon is highlighted as the operative difference.

### 1.4 — التحكم في المسار
**`FlowDiagram`.** `if` as an expression producing a value; `loop` with `break` carrying a value out.

### 2.1 — الستاك والهيب ⭐
**`MemoryStepper`, ~6 steps.**

Program: a stack integer, then a `String`, then a second `String` from a literal.

Steps walk through: empty frame → `let x = 5` (stack slot, value inline) → `let s = String::from("hi")` (three-field slot + heap block + pointer) → an insight callout contrasting the two → scope end → both freed.

This lesson establishes the vocabulary for everything after it. It must be the clearest visual on the site.

### 2.2 — الملكية والنقل ⭐⭐ (flagship)
**`MemoryStepper`, 7 steps.**

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;
    println!("{}", s2);
}
```

| Step | Code line | Memory state | Explanation focus |
|---|---|---|---|
| 1 | 1 | empty `main` frame | البرنامج بدأ |
| 2 | 2 | `s1` slot {ptr,len,cap} + heap "hello" + pointer | إيه اللي حصل فعلاً في الذاكرة |
| 3 | 2 | same, insight callout | `String` = ٣ كلمات على الستاك + بيانات على الهيب |
| 4 | 3 | `s2` slot appears, copies 3 fields, points to same heap block; `s1` → `moved` | **النقل حصل هنا** |
| 5 | 3 | same, insight callout | ما حصلش نسخ للهيب — ٢٤ بايت بس اتنسخوا |
| 6 | 3 | same, error callout showing the real compiler message | لو جربت تستخدم `s1` دلوقتي |
| 7 | 4 | `s2` dropped, heap block freed, all fading | نهاية الـscope |

Step 6 is the one that makes the lesson land: showing the actual `borrow of moved value` error at the exact moment the learner can see *why* it must be an error.

**Budget more time on this than any other single artifact on the site.** It is the reason someone shares the link.

### 2.3 — الاستعارة
**`MemoryStepper`, ~8 steps.** Adds a borrow counter beside the owner slot. Function call creates a borrow arrow; return removes it. Shows that the borrow never owns and never frees.

### 2.4 — الاستعارة القابلة للتغيير
**`MemoryStepper`, two sequences.** Legal: one `&mut`. Illegal: `&mut` plus `&`, with the conflicting borrow rendered in red and the compiler error shown. The exclusivity rule becomes visible rather than memorised.

### 2.5 — الشرائح
**`MemoryStepper` with window rendering.** A slice draws as a bracket spanning a sub-range of an existing heap block, with its own `{ptr, len}` on the stack. Makes clear the slice allocates nothing.

### 3.1 — الـ Structs
**Static SVG.** Field layout in memory, including padding. Optionally show `#[repr(C)]` vs default reordering.

### 3.2 — الـ Enums
**Static SVG.** Discriminant + payload, sized by the largest variant. Sets up the niche-optimisation point in 3.4.

### 3.3 — مطابقة الأنماط
**`FlowDiagram`, interactive.** Learner changes the input; the matching arm highlights.

### 3.4 — `Option`
**Static SVG.** `Option<Box<T>>` and `Box<T>` drawn at identical size, showing the null-pointer niche. A genuinely surprising fact that sticks.

### 3.5 — `Result`
**`FlowDiagram`.** `?` propagation through nested calls — the early-return path drawn explicitly.

### 4.1 — الأنواع العامة
**Static SVG + `showAsm`.** One generic function expanding into three concrete functions after monomorphisation, with the assembly confirming it.

### 4.3 — دورات الحياة ⭐
**`LifetimeTimeline`.** Two sequences: valid (borrow ends before owner) and dangling (borrow outlives owner, marked red). Lifetimes are inherently temporal, which is exactly why static diagrams fail and a timeline works.

### 4.4 — الإرسال الساكن مقابل الديناميكي ⭐
**Static SVG + `showAsm`.** vtable layout diagram beside the two assembly outputs — a direct `call` versus an indirect load-then-call. The difference is invisible in source and unmistakable in generated code.

### 5.1 — المجموعات
**`MemoryStepper`.** `Vec` growth: pushes fill capacity, then reallocation — a new larger heap block, contents copied, old block freed. Shows why held pointers would be invalidated.

### 5.5 — التجريدات صفرية التكلفة ⭐⭐
**`showAsm`, side by side.** An iterator chain and a hand-written loop compiling to identical assembly. No custom component needed — the two assembly panels *are* the visual, and they are the most persuasive artifact the site can produce.

---

## 5. Technical implementation

**Rendering:** SVG, not canvas. Inspectable, styleable via CSS variables, scales cleanly, and accessible.

**Theming:** every colour is a CSS variable. Dark mode is then free, and so is print.

```css
--mem-owned, --mem-borrowed, --mem-borrowed-mut,
--mem-moved, --mem-freed, --mem-stack-bg, --mem-heap-bg,
--mem-pointer, --mem-error
```

**Bundle discipline:** components are per-page islands. A lesson with no stepper ships no stepper code. Prose-only lessons ship zero JavaScript.

**No animation library.** CSS transitions on SVG attributes cover everything here. Every dependency is weight on the page.

**Direction:** the memory panel and code panel are `dir="ltr"`. The explanation panel and controls are `dir="rtl"`. This mixed-direction layout must be tested explicitly — it is the most likely place for the layout to break.

**Accessibility:** each step's Arabic explanation is the text alternative for that state. Component is keyboard-navigable. `prefers-reduced-motion` disables transitions without disabling stepping.

---

## 6. Authoring workflow

1. Write the lesson prose first. The visual illustrates a point the prose already makes.
2. Identify the single moment the learner will misunderstand. That moment is the visual.
3. Write the `Step[]` array in a co-located `.steps.ts` file, typed so the build catches mistakes.
4. Import into the MDX lesson.

```
content/rust/02-ownership/02-move.mdx
content/rust/02-ownership/02-move.steps.ts
```

**Time budget:** roughly half of a lesson's writing time. The flagship visuals (2.1, 2.2, 4.3, 4.4, 5.5) justify more.

---

## 7. Build order for visuals

**Leave period 1:** `MemoryStepper` + visuals for 2.1 and 2.2, plus static SVGs for 0.4, 1.1, 1.2, 1.3.

Getting `MemoryStepper` right is the whole job. Once it exists and its data format is proven against two real lessons, every subsequent memory visual is a data file.

**Leave period 2:** visuals for 2.3, 2.4, 2.5 — all data-only, no new components.

**Leave period 3:** `FlowDiagram` and `LifetimeTimeline`.
