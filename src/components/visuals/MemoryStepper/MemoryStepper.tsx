/**
 * MemoryStepper — the one interactive component on the launch critical path.
 *
 * Behaviour is specified in PLAN.md §5.3; the data format in §5.1 (types.ts).
 * Read docs/VISUALS.md before changing anything visual.
 *
 * The rules that are easy to break and expensive to break:
 *
 *   Direction   Code panel and memory panel are dir="ltr". Explanation, notes
 *               and controls are dir="rtl". The boundary is a hard rule and is
 *               tested at 380px (tests/rtl.spec.ts).
 *
 *   Keyboard    ArrowLeft = NEXT, ArrowRight = PREVIOUS. Arrow keys follow
 *               VISUAL direction, and in an RTL layout the next control sits on
 *               the left. Getting this backwards is the classic RTL bug.
 *
 *   Text alt    The SVG/diagram is aria-hidden. `step.explanation` is the text
 *               alternative and lives in an aria-live="polite" region, so a
 *               screen-reader user gets the same lesson.
 *
 *   Numerals    Western 0-9, controls included — الخطوة 3 / 7, never ٣ / ٧.
 *
 *   Motion      Transitions are CSS-only and driven by --dur-step, which
 *               prefers-reduced-motion already zeroes in tokens.css. Reduced
 *               motion must never disable STEPPING, only the animation.
 *
 * No autoplay, ever. The learner sets the pace.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type {
  Cell,
  HeapBlock,
  Link,
  MemoryStepperProps,
  StackSlot,
  Step,
} from './types.ts';
import { cellKind, cellText, linesOf, slotRender, targetBlock } from './types.ts';

// ── small pure helpers ──────────────────────────────────────────────────────

/** Every arrow the current step needs, derived + explicit, deduplicated. */
function edgesOf(step: Step): Link[] {
  const out: Link[] = [];
  const seen = new Set<string>();
  const push = (l: Link) => {
    const key = `${l.from}→${l.to}:${l.kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(l);
  };

  for (const frame of step.frames) {
    for (const slot of frame.slots) {
      // A moved or dropped binding never draws a pointer: the whole point of
      // lesson 2.2 is that no arrow leaves an invalid binding. This falls out
      // of the data (a moved slot carries no pointsTo) but is asserted here so
      // a future authoring slip cannot resurrect the arrow.
      if (slot.pointsTo && slot.state !== 'moved' && slot.state !== 'dropped') {
        push({ from: slot.id, to: targetBlock(slot.pointsTo), kind: 'pointer' });
      }
      for (const b of slot.borrows ?? []) {
        push({
          from: slot.id,
          to: b.owner,
          kind: b.kind === 'mut' ? 'borrow_mut' : 'borrow',
          label: b.label,
        });
      }
    }
  }
  for (const l of step.links ?? []) push(l);
  return out;
}

/** Cells to render for a heap block, padded out to `capacity` with spares. */
function cellsWithSpares(block: HeapBlock): Cell[] {
  const cap = block.capacity ?? block.cells.length;
  if (cap <= block.cells.length) return block.cells;
  const spares: Cell[] = Array.from({ length: cap - block.cells.length }, () => ({
    text: '',
    kind: 'spare' as const,
  }));
  return [...block.cells, ...spares];
}

// ── sub-renderers ───────────────────────────────────────────────────────────

function CellBox({ cell, index, windowed }: { cell: Cell; index: number; windowed: boolean }) {
  const kind = cellKind(cell);
  const text = cellText(cell);
  const offset = typeof cell === 'string' ? undefined : cell.offset;
  return (
    <div
      class={`ms-cell ms-cell--${kind}${windowed ? ' is-windowed' : ''}`}
      data-index={index}
    >
      <span class="ms-cell-text">{text || (kind === 'padding' ? '·' : '')}</span>
      {offset !== undefined && <span class="ms-cell-offset">{offset}</span>}
    </div>
  );
}

function SlotBox({ slot }: { slot: StackSlot }) {
  const mode = slotRender(slot);
  return (
    <div class={`ms-slot is-${slot.state}`} data-ms-id={slot.id}>
      <div class="ms-slot-head">
        <span class="ms-slot-name">{slot.name}</span>
        {slot.typeName && <span class="ms-slot-type">{slot.typeName}</span>}
      </div>

      {mode === 'inline' && <div class="ms-slot-value">{slot.value ?? ''}</div>}

      {mode === 'fields' && (
        <div class="ms-fields">
          {(slot.fields ?? []).map((f) => (
            <div class={`ms-field${f.changed ? ' is-changed' : ''}`} key={f.label}>
              <span class="ms-field-label">{f.label}</span>
              <span class="ms-field-value">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {mode === 'layout' && (
        <div class="ms-cells">
          {(slot.cells ?? []).map((c, i) => (
            <CellBox cell={c} index={i} windowed={false} key={i} />
          ))}
        </div>
      )}

      <div class="ms-slot-foot">
        {/* The state word is not decoration. PLAN.md §6: the palette entries sit
            close in luminance on purpose, so colour alone must never be what
            identifies a state. These are also the exact words rustc uses
            ("value moved here"), which is the vocabulary the learner will meet
            in the error message two screens later. */}
        <span class="ms-state">{slot.state}</span>
        {slot.bytes !== undefined && <span class="ms-bytes">{slot.bytes} B</span>}
        {slot.borrowCounter && (
          <span class="ms-borrow-count">
            &amp;{slot.borrowCounter.shared} &amp;mut{slot.borrowCounter.mut}
          </span>
        )}
      </div>
    </div>
  );
}

function HeapBox({ block, window: win }: { block: HeapBlock; window?: { from: number; to: number } }) {
  return (
    <div class={`ms-block is-${block.state}`} data-ms-id={block.id}>
      {block.label && <div class="ms-block-label">{block.label}</div>}
      <div class="ms-cells">
        {cellsWithSpares(block).map((c, i) => (
          <CellBox cell={c} index={i} windowed={!!win && i >= win.from && i < win.to} key={i} />
        ))}
      </div>
      <div class="ms-block-foot">
        <span class="ms-state">{block.state}</span>
        {block.capacity !== undefined && (
          <span class="ms-cap">
            len {block.cells.length} / cap {block.capacity}
          </span>
        )}
        {block.bytes !== undefined && <span class="ms-bytes">{block.bytes} B</span>}
      </div>
    </div>
  );
}

// ── the component ───────────────────────────────────────────────────────────

export default function MemoryStepper({
  visual,
  initialStep = 0,
  highlightedCode,
}: MemoryStepperProps) {
  // sequenceIndex is always 0 at launch. The field exists because lesson 2.4
  // needs two sequences and adding it later would be the schema change this
  // whole design exists to avoid (PLAN.md §5.2).
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const sequence = visual.sequences[sequenceIndex] ?? visual.sequences[0];
  const stepCount = sequence.steps.length;

  const clamp = useCallback(
    (n: number) => Math.min(Math.max(n, 0), stepCount - 1),
    [stepCount],
  );

  const [stepIndex, setStepIndex] = useState(() => clamp(initialStep));
  const [reducedMotion, setReducedMotion] = useState(false);

  const step = sequence.steps[stepIndex];
  const codeLines = useMemo(() => sequence.code.replace(/\n$/, '').split('\n'), [sequence.code]);
  const highlighted = highlightedCode?.[sequenceIndex];
  const activeLines = useMemo(() => linesOf(step.highlight), [step.highlight]);

  // ── deep links: /rust/ownership/move/#step-4 lands on that step ──────────
  useEffect(() => {
    const m = /^#step-(\d+)$/.exec(window.location.hash);
    if (m) setStepIndex(clamp(Number(m[1]) - 1));
    // Mount only. Reacting to later hash changes would fight the replaceState
    // below, and nothing else on the page writes this hash.
  }, [clamp]);

  useEffect(() => {
    // replaceState, not pushState: a learner stepping through seven steps must
    // not have to press Back seven times to leave the lesson.
    const url = `${window.location.pathname}${window.location.search}#step-${stepIndex + 1}`;
    window.history.replaceState(null, '', url);
  }, [stepIndex]);

  // ── reduced motion, live-updating ───────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const goto = useCallback((n: number) => setStepIndex(clamp(n)), [clamp]);
  const next = useCallback(() => setStepIndex((i) => clamp(i + 1)), [clamp]);
  const prev = useCallback(() => setStepIndex((i) => clamp(i - 1)), [clamp]);

  // ── keyboard: arrows follow VISUAL direction, so left = next in RTL ──────
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          next();
          break;
        case 'ArrowRight':
          e.preventDefault();
          prev();
          break;
        case 'Home':
          e.preventDefault();
          goto(0);
          break;
        case 'End':
          e.preventDefault();
          goto(stepCount - 1);
          break;
        default:
          break;
      }
    },
    [next, prev, goto, stepCount],
  );

  // ── touch: same visual-direction mapping as the arrow keys ──────────────
  const touchX = useRef<number | null>(null);
  const onTouchStart = useCallback((e: TouchEvent) => {
    touchX.current = e.changedTouches[0]?.clientX ?? null;
  }, []);
  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (touchX.current === null) return;
      const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
      touchX.current = null;
      if (Math.abs(dx) < 40) return;
      // Swiping left moves toward the next step, matching ArrowLeft.
      if (dx < 0) next();
      else prev();
    },
    [next, prev],
  );

  // ── arrows: measured from the DOM, drawn into an aria-hidden overlay ─────
  //
  // The boxes are HTML, not SVG: Arabic and Latin text in HTML shapes, wraps
  // and honours dir= correctly, and SVG <text> does none of that. Only the
  // arrows need geometry, so only the arrows are SVG — an absolutely
  // positioned overlay whose coordinates come from getBoundingClientRect().
  //
  // If measurement has not run yet the boxes are all still there and the
  // explanation still carries the lesson. The arrows are an enhancement on a
  // diagram that is already complete without them.
  const panelRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<{ d: string; kind: string; key: string }[]>([]);
  const [overlay, setOverlay] = useState({ w: 0, h: 0 });

  const edges = useMemo(() => edgesOf(step), [step]);

  const measure = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const base = panel.getBoundingClientRect();
    setOverlay({ w: base.width, h: base.height });

    const find = (id: string) =>
      panel.querySelector<HTMLElement>(`[data-ms-id="${CSS.escape(id)}"]`);

    const out: { d: string; kind: string; key: string }[] = [];
    for (const edge of edges) {
      const a = find(edge.from);
      const b = find(edge.to);
      if (!a || !b) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();

      // Anchor on the facing EDGES, never on centres: a line that ends in the
      // middle of a heap block visually points at one byte rather than at the
      // block, which is a claim the data does not make.
      //
      // Two layouts to serve. Side by side (≥641px) the stack is left of the
      // heap, so the arrow leaves the source's right edge and arrives at the
      // target's left edge. Stacked (mobile) the heap sits below, so it leaves
      // the bottom and arrives at the top.
      const horizontal = ra.right <= rb.left + 8;
      const below = rb.top >= ra.bottom - 8;

      let x1: number, y1: number, x2: number, y2: number, d: string;

      if (horizontal) {
        x1 = ra.right - base.left;
        y1 = ra.top + ra.height / 2 - base.top;
        x2 = rb.left - base.left;
        y2 = rb.top + rb.height / 2 - base.top;
        const dx = Math.max(24, Math.abs(x2 - x1) * 0.5);
        d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      } else {
        // Vertical (or overlapping): edge to edge on the block axis.
        x1 = ra.left + ra.width / 2 - base.left;
        x2 = rb.left + rb.width / 2 - base.left;
        y1 = (below ? ra.bottom : ra.top) - base.top;
        y2 = (below ? rb.top : rb.bottom) - base.top;
        const dy = Math.max(16, Math.abs(y2 - y1) * 0.5);
        const s = below ? 1 : -1;
        d = `M ${x1} ${y1} C ${x1} ${y1 + s * dy}, ${x2} ${y2 - s * dy}, ${x2} ${y2}`;
      }

      out.push({ d, kind: edge.kind, key: `${edge.from}-${edge.to}-${edge.kind}` });
    }
    setPaths(out);
  }, [edges]);

  useLayoutEffect(() => {
    measure();
  }, [measure, stepIndex]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(panel);
    // Web fonts change every box's size when they land. Without this the
    // arrows are drawn against fallback-font geometry and stay there.
    document.fonts?.ready.then(() => measure()).catch(() => {});
    return () => ro.disconnect();
  }, [measure]);

  // Slice windows (lesson 2.5): a slot may point INTO a block rather than at it.
  const windows = useMemo(() => {
    const m = new Map<string, { from: number; to: number }>();
    for (const frame of step.frames) {
      for (const slot of frame.slots) {
        if (slot.pointsTo && typeof slot.pointsTo !== 'string') {
          m.set(slot.pointsTo.block, { from: slot.pointsTo.from, to: slot.pointsTo.to });
        }
      }
    }
    return m;
  }, [step]);

  const conflicting = useMemo(
    () => new Set(step.conflict?.slots ?? []),
    [step.conflict],
  );

  return (
    <section
      class={`ms${reducedMotion ? ' is-static' : ''}`}
      role="group"
      aria-roledescription="عرض تفاعلي خطوة بخطوة للذاكرة"
      aria-label={visual.titleAr}
      dir="rtl"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <h3 class="ms-title">{visual.titleAr}</h3>

      {visual.sequences.length > 1 && (
        <div class="ms-tabs" role="tablist">
          {visual.sequences.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === sequenceIndex}
              class={`ms-tab${i === sequenceIndex ? ' is-active' : ''}`}
              onClick={() => {
                setSequenceIndex(i);
                setStepIndex(0);
              }}
            >
              {s.labelAr ?? s.id}
            </button>
          ))}
        </div>
      )}

      <div class="ms-panels">
        {/* ── code, LTR ─────────────────────────────────────────────── */}
        <div class="ms-code" dir="ltr">
          {/* dir="ltr" here as well as on the wrapper. It would inherit, but
              CLAUDE.md's rule is that every code surface carries the attribute
              explicitly: inheritance breaks the moment this <pre> is moved or
              reused, and the failure is silent. Same belt-and-braces the rehype
              plugin applies to prose code blocks. */}
          <pre tabIndex={0} dir="ltr">
            <code>
              {codeLines.map((line, i) => {
                const n = i + 1;
                const html = highlighted ? highlighted[i] : undefined;
                return (
                  <span
                    key={n}
                    class={`ms-line${activeLines.has(n) ? ' is-active' : ''}`}
                  >
                    <span class="ms-lineno" aria-hidden="true">
                      {n}
                    </span>
                    {html !== undefined ? (
                      <span class="ms-linecode" dangerouslySetInnerHTML={{ __html: html }} />
                    ) : (
                      <span class="ms-linecode">{line}</span>
                    )}
                  </span>
                );
              })}
            </code>
          </pre>
        </div>

        {/* ── memory, LTR. aria-hidden: the explanation below is the text
             alternative for everything drawn here. ──────────────────── */}
        <div class="ms-memory" dir="ltr" aria-hidden="true" ref={panelRef}>
          <svg
            class="ms-arrows"
            width={overlay.w}
            height={overlay.h}
            viewBox={`0 0 ${overlay.w || 1} ${overlay.h || 1}`}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <marker
                id="ms-arrowhead"
                markerWidth="7"
                markerHeight="7"
                refX="6"
                refY="3.5"
                orient="auto"
              >
                <path d="M0,0 L7,3.5 L0,7 z" fill="context-stroke" />
              </marker>
            </defs>
            {paths.map((p) => (
              <path
                key={p.key}
                d={p.d}
                class={`ms-arrow ms-arrow--${p.kind}`}
                marker-end="url(#ms-arrowhead)"
              />
            ))}
          </svg>

          <div class="ms-region ms-region--stack">
            <div class="ms-region-label">stack</div>
            {step.frames.map((frame) => (
              <div class={`ms-frame is-${frame.state ?? 'active'}`} key={frame.id}>
                <div class="ms-frame-label">{frame.fn}</div>
                <div class="ms-frame-slots">
                  {frame.slots.length === 0 ? (
                    <div class="ms-frame-empty">(empty)</div>
                  ) : (
                    frame.slots.map((slot) => (
                      <div
                        class={`ms-slot-wrap${conflicting.has(slot.id) ? ' is-conflict' : ''}`}
                        key={slot.id}
                      >
                        {conflicting.has(slot.id) && <span class="ms-conflict-badge">✕</span>}
                        <SlotBox slot={slot} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          <div class="ms-region ms-region--heap">
            <div class="ms-region-label">heap</div>
            {step.heap.length === 0 ? (
              <div class="ms-region-empty">(empty)</div>
            ) : (
              step.heap.map((b) => <HeapBox block={b} window={windows.get(b.id)} key={b.id} />)
            )}
          </div>

          {step.statics && step.statics.length > 0 && (
            <div class="ms-region ms-region--static">
              <div class="ms-region-label">static</div>
              {step.statics.map((s) => (
                <div class="ms-block is-static" data-ms-id={s.id} key={s.id}>
                  <div class="ms-block-label">{s.label}</div>
                  <div class="ms-cells">
                    {s.cells.map((c, i) => (
                      <CellBox cell={c} index={i} windowed={false} key={i} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── explanation: the text alternative, RTL, announced on change ── */}
      <div class="ms-explain" aria-live="polite">
        <p class="ms-explain-text">{step.explanation}</p>

        {step.note && (
          <div class={`ms-note is-${step.note.kind}`}>
            <p class="ms-note-text">{step.note.text}</p>
            {step.note.code && (
              <>
                <pre class="ms-note-code" dir="ltr" tabIndex={0}>
                  <code>{step.note.code}</code>
                </pre>
                <p class="ms-rustc">rustc {sequence.rustcVersion}</p>
              </>
            )}
          </div>
        )}

        {step.conflict && (
          <div class="ms-note is-error">
            <p class="ms-note-text">{step.conflict.message}</p>
            {step.conflict.code && (
              <>
                <pre class="ms-note-code" dir="ltr" tabIndex={0}>
                  <code>{step.conflict.code}</code>
                </pre>
                <p class="ms-rustc">rustc {sequence.rustcVersion}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── controls, RTL. In RTL the NEXT control sits on the left. ───── */}
      <div class="ms-controls">
        <button
          type="button"
          class="ms-btn"
          onClick={next}
          disabled={stepIndex >= stepCount - 1}
          aria-label="الخطوة التالية"
        >
          <span aria-hidden="true">←</span> التالي
        </button>

        <span class="ms-counter" dir="rtl">
          الخطوة {stepIndex + 1} / {stepCount}
        </span>

        <button
          type="button"
          class="ms-btn"
          onClick={prev}
          disabled={stepIndex <= 0}
          aria-label="الخطوة السابقة"
        >
          السابق <span aria-hidden="true">→</span>
        </button>
      </div>

      <ol class="ms-dots" aria-hidden="true">
        {sequence.steps.map((_, i) => (
          <li key={i}>
            <button
              type="button"
              class={`ms-dot${i === stepIndex ? ' is-active' : ''}`}
              onClick={() => goto(i)}
              tabIndex={-1}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ol>

      <p class="ms-hint">
        استخدم الأسهم في لوحة المفاتيح، أو اسحب بإصبعك على الشاشة.
      </p>
    </section>
  );
}
