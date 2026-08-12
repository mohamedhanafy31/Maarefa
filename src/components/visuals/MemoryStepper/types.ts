/**
 * MemoryStepper — the visual data format.
 *
 * AUTHORITATIVE SOURCE: PLAN.md §5.1. This file is that schema, transcribed.
 * It was fixed against all seven planned memory visuals (PLAN.md §5.2) BEFORE
 * any component code existed, because a schema change discovered at lesson 2.4
 * would force a rewrite of every `.steps.ts` authored before it — possibly
 * during a period with no laptop.
 *
 * Every content/**\/*.steps.ts imports these types, so an authoring mistake is
 * a type error at `astro check` rather than a wrong diagram in production.
 *
 * The types in docs/VISUALS.md §3.1 are SUPERSEDED (CLAUDE.md, locked decision
 * E5): they could not express frames, note text, slice windows, conflicts, or
 * multi-line highlight.
 */

// ── top level ────────────────────────────────────────────────────

export type MemoryVisual = {
  id: string;
  titleAr: string;
  /** One for most visuals. Lesson 2.4 uses two: legal and illegal. */
  sequences: Sequence[];
};

export type Sequence = {
  id: string;
  /** Tab label. Required when sequences.length > 1. */
  labelAr?: string;
  /** Rust source, LTR, highlighted by Shiki at build. */
  code: string;
  /**
   * Stamped beside any `note.code` or `conflict.code` in this sequence.
   * CLAUDE.md: every quoted error displays the rustc version it came from —
   * error wording drifts between releases and an unversioned quote rots.
   */
  rustcVersion: string;
  steps: Step[];
};

// ── a step ───────────────────────────────────────────────────────

export type Step = {
  /** Was `codeLine: number`. Steps 2 and 3 of lesson 2.2 both sit on line 2. */
  highlight: LineRange;
  /** Arabic, 1–3 sentences. This is the text alternative for the whole diagram. */
  explanation: string;
  /** Ordered, outermost first. MAY be empty — an empty frame still renders. */
  frames: Frame[];
  heap: HeapBlock[];
  /** String literals and consts. Only present when the lesson is about them. */
  statics?: StaticBlock[];
  /** Explicit edges. Plain pointers are derived from `pointsTo` and need no entry. */
  links?: Link[];
  note?: Note;
  conflict?: Conflict;
};

export type LineRange = number | number[] | { from: number; to: number };

// ── stack ────────────────────────────────────────────────────────

export type Frame = {
  id: string;
  fn: string; // 'main', 'calculate_length'
  slots: StackSlot[]; // may be []
  state?: 'active' | 'parent' | 'returning';
};

export type StackSlot = {
  id: string;
  name: string; // 's1'
  state: SlotState;
  /** Defaults: 'fields' if `fields`, 'layout' if `cells`, else 'inline'. */
  render?: 'inline' | 'fields' | 'layout';
  value?: string; // render 'inline'  → 5
  fields?: Field[]; // render 'fields'  → ptr / len / cap
  cells?: Cell[]; // render 'layout'  → byte layout with padding
  pointsTo?: PointerTarget;
  /** THIS slot borrows FROM the named owners. Arrow is drawn borrower → owner. */
  borrows?: Borrow[];
  /** Rendered beside an owner slot in lesson 2.3. */
  borrowCounter?: { shared: number; mut: number };
  typeName?: string; // 'String', '&str' — small, LTR
  bytes?: number; // total size, shown when size is the lesson
};

export type SlotState =
  | 'owned'
  | 'borrowed'
  | 'borrowed_mut'
  | 'moved'
  | 'dropped'
  | 'uninitialised';

export type Field = {
  label: string;
  value: string;
  /** Draws the change emphasis for this step only. */
  changed?: boolean;
};

export type PointerTarget =
  | string // the whole block
  | { block: string; from: number; to: number }; // a window into it (lesson 2.5)

export type Borrow = { owner: string; kind: 'shared' | 'mut'; label?: string };

// ── heap ─────────────────────────────────────────────────────────

export type HeapBlock = {
  id: string;
  cells: Cell[];
  /** ≥ cells.length. The surplus renders as empty spare slots (lesson 5.1). */
  capacity?: number;
  state: 'alive' | 'freed';
  label?: string; // 'String data' — LTR
  bytes?: number;
  /** Reallocation provenance; draws the copy arrow in lesson 5.1. */
  copiedFrom?: string;
};

export type Cell =
  | string
  | {
      text?: string;
      kind?: 'value' | 'padding' | 'uninit' | 'spare';
      offset?: number; // byte offset, shown when bytes are the lesson
    };

export type StaticBlock = { id: string; label: string; cells: Cell[] };

// ── annotations ──────────────────────────────────────────────────

export type Link = {
  from: string; // slot or block id
  to: string;
  kind: 'pointer' | 'borrow' | 'borrow_mut' | 'invalid';
  label?: string;
};

export type Note = {
  kind: 'insight' | 'error' | 'warning';
  text: string; // Arabic
  /** Verbatim compiler output. Rendered dir="ltr" with the sequence's rustcVersion. */
  code?: string;
};

export type Conflict = {
  slots: string[]; // rendered in the error colour with an ✕ badge
  message: string; // Arabic
  code?: string; // verbatim compiler error
};

// ── component props (PLAN.md §5.3) ───────────────────────────────

export type MemoryStepperProps = {
  visual: MemoryVisual;
  /** 0-based. Deep links land on a step: /rust/ownership/move/#step-4 */
  initialStep?: number;
  /**
   * Pre-highlighted code from Shiki, produced at build by the .astro wrapper so
   * no highlighter ships to the client.
   *
   * Two levels: highlightedCode[sequenceIndex][lineIndex]. Per-LINE rather than
   * one blob, because the stepper puts a rail and a tint on the single line the
   * current step is about.
   *
   * When absent the component renders plain text — correct, just unstyled.
   */
  highlightedCode?: string[][];
};

// ── helpers shared by the renderer ───────────────────────────────

/** Normalise the three LineRange forms to a Set of 1-based line numbers. */
export function linesOf(range: LineRange): Set<number> {
  if (typeof range === 'number') return new Set([range]);
  if (Array.isArray(range)) return new Set(range);
  const out = new Set<number>();
  for (let n = range.from; n <= range.to; n++) out.add(n);
  return out;
}

/** A Cell is either a bare string or an object; this flattens both. */
export function cellText(cell: Cell): string {
  return typeof cell === 'string' ? cell : (cell.text ?? '');
}

export function cellKind(cell: Cell): NonNullable<Exclude<Cell, string>['kind']> {
  return typeof cell === 'string' ? 'value' : (cell.kind ?? 'value');
}

/**
 * `render` is optional in the schema with documented defaults:
 * 'fields' if `fields`, 'layout' if `cells`, else 'inline'.
 */
export function slotRender(slot: StackSlot): 'inline' | 'fields' | 'layout' {
  if (slot.render) return slot.render;
  if (slot.fields) return 'fields';
  if (slot.cells) return 'layout';
  return 'inline';
}

/** Resolve a PointerTarget to the block id it refers to. */
export function targetBlock(target: PointerTarget): string {
  return typeof target === 'string' ? target : target.block;
}
