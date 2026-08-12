#!/usr/bin/env python3
"""Prove the subset did not break Arabic shaping.

R-5 in PLAN.md: naive codepoint subsetting silently drops the GSUB/GPOS
lookups that select initial/medial/final letterforms, and Arabic renders as
disconnected letters. It fails partially, so a casual look passes and a
screenshot baseline captures the broken output forever.

This checks the font binary rather than the rendering. The rendered pangram is
still reviewed by a human before any baseline is committed — the two checks
catch different things.

Exit code 1 on any failure, so CI can gate on it.
"""

import sys
from pathlib import Path
from fontTools.ttLib import TTFont

OUT = Path(__file__).resolve().parent.parent / "public" / "fonts"

# Features Arabic shaping actually depends on. `isol` is absent by design in
# IBM Plex Sans Arabic — the isolated form is the default cmap mapping, not a
# substitution — so it is checked by rendering, not by feature name.
ARABIC_REQUIRED = {"init", "medi", "fina", "ccmp", "rlig", "calt", "mark", "mkmk"}

# Must NOT survive in the mono face: this is where coding ligatures live.
MONO_FORBIDDEN = {"calt", "liga", "dlig", "clig"}

# A pangram-ish sample. Bidi controls (U+200C-200F) are deliberately NOT
# checked: they are zero-width formatting characters consumed by the text
# engine, and IBM Plex Sans Arabic does not map them in the source either.
# Requiring them in the cmap would fail a font that is perfectly correct.
REQUIRED_CODEPOINTS = [
    ("arabic letters", "أبجد هوز حطي كلمن سعفص قرشت ثخذ ضظغ"),
    ("arabic punctuation", "،؛؟"),
    ("western digits", "0123456789"),
    ("latin", "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"),
]

# Three copies of one letter: the run must shape to initial + medial + final,
# i.e. three DIFFERENT glyphs for the same character. If the joining lookups
# were dropped, all three collapse to the isolated form and are identical.
# Using a repeated letter rather than tatweel keeps the comparison clean —
# tatweel is a glyph of its own and would pollute the result.
SHAPING_CASES = [
    ("beh U+0628", "ببب"),
    ("ain U+0639", "ععع"),
    ("seen U+0633", "سسس"),
]


def features(font, tag):
    if tag not in font:
        return set()
    return {fr.FeatureTag for fr in font[tag].table.FeatureList.FeatureRecord}


def _hb_font(path):
    """Load the shipped WOFF2 into HarfBuzz.

    HarfBuzz cannot decompress WOFF2, so handing it the .woff2 directly yields
    .notdef for every glyph — a test that silently passes nothing. fontTools
    (with brotli) reads it, so re-serialise to TTF bytes in memory. This still
    verifies the artifact we actually ship, not a parallel TTF build.
    """
    import io
    import uharfbuzz as hb

    ft = TTFont(path)
    buf = io.BytesIO()
    ft.flavor = None          # drop woff2 wrapping
    ft.save(buf)
    ft.close()
    face = hb.Face(hb.Blob(buf.getvalue()))
    return hb.Font(face)


def shape(hb_font, text):
    """Shape a string and return the resulting glyph ids."""
    import uharfbuzz as hb

    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hb_font, buf)
    return [g.codepoint for g in buf.glyph_infos]


def check_shaping(path):
    """Prove joining actually happens, rather than trusting feature tags.

    This is the check that matters for R-5. A font can retain every feature
    tag and still shape wrongly if the lookups were emptied, and a font can
    lack an `isol` tag and shape perfectly. Only the engine settles it.
    """
    font = _hb_font(path)
    ok = True

    for label, run in SHAPING_CASES:
        glyphs = shape(font, run)
        if 0 in glyphs:
            print(f"  FAIL  {label}: .notdef in output {glyphs} — glyphs missing")
            ok = False
            continue
        distinct = len(set(glyphs))
        if distinct == 3:
            print(f"  ok    {label}: '{run}' → initial/medial/final {glyphs}")
        else:
            print(f"  FAIL  {label}: '{run}' → {distinct} distinct glyph(s) {glyphs}")
            print("        expected 3 — letters are not joining, the subset broke shaping")
            ok = False

    # A whole word must shape contextually, not one isolated glyph per char.
    word = "مرحبا"
    joined = shape(font, word)
    per_char = [(shape(font, c) or [None])[0] for c in word]
    if 0 in joined:
        print(f"  FAIL  word shaping: .notdef in 'مرحبا' output")
        ok = False
    elif joined != per_char:
        print(f"  ok    word shaping: 'مرحبا' shapes contextually {joined}")
    else:
        print(f"  FAIL  word shaping: 'مرحبا' produced isolated forms only")
        ok = False

    return ok


def check(path, required, forbidden, codepoint_sets):
    print(f"\n=== {path.name} ===")
    if not path.exists():
        print("  MISSING — run scripts/subset-fonts.sh first")
        return False
    font = TTFont(path, lazy=True)
    ok = True

    present = features(font, "GSUB") | features(font, "GPOS")

    missing = required - present
    if missing:
        print(f"  FAIL  lost required features: {' '.join(sorted(missing))}")
        ok = False
    else:
        print(f"  ok    all required features retained: {' '.join(sorted(required))}")

    survived = forbidden & present
    if survived:
        print(f"  FAIL  forbidden features survived: {' '.join(sorted(survived))}")
        ok = False
    elif forbidden:
        print(f"  ok    ligature features removed: {' '.join(sorted(forbidden))}")

    cmap = font.getBestCmap()
    for label, sample in codepoint_sets:
        absent = [c for c in sample if ord(c) not in cmap]
        if absent:
            names = " ".join(f"U+{ord(c):04X}" for c in absent)
            print(f"  FAIL  {label}: missing {names}")
            ok = False
        else:
            print(f"  ok    {label}: all {len(set(sample))} codepoints present")

    n = font["maxp"].numGlyphs
    print(f"  ok    {n} glyphs retained")
    font.close()

    # The decisive test: run HarfBuzz and confirm letters actually join.
    if "init" in required:
        ok = check_shaping(path) and ok

    return ok


def main():
    results = []
    for weight in (400, 500, 600):
        results.append(
            check(OUT / f"plex-arabic-{weight}.woff2", ARABIC_REQUIRED, set(),
                  REQUIRED_CODEPOINTS)
        )
    for weight in (400, 700):
        results.append(
            check(OUT / f"jetbrains-mono-{weight}.woff2", {"ccmp"}, MONO_FORBIDDEN,
                  [("latin", REQUIRED_CODEPOINTS[3][1]),
                   ("western digits", REQUIRED_CODEPOINTS[2][1])])
        )

    print()
    if all(results):
        print("PASS — subsets are structurally sound.")
        print("Rendering still needs a human: check the pangram at 380px before")
        print("committing any screenshot baseline.")
        return 0
    print("FAIL — do not commit these subsets.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
