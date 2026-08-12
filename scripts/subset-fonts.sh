#!/usr/bin/env bash
# Subset the two site faces to WOFF2. Run once, commit the output, never in CI.
#
#   ./scripts/subset-fonts.sh
#
# Requires: python3 with fonttools>=4.61 and brotli.
#   python3 -m pip install fonttools brotli
#
# WHY THE FLAGS MATTER
#
# Arabic is a joining script: every letter has initial/medial/final/isolated
# forms selected at render time by GSUB lookups, with diacritics positioned by
# GPOS mark/mkmk. A subset that drops those tables renders Arabic as
# disconnected letters — and it fails *partially*, so a casual look passes.
#
# We therefore pass --layout-features='*' on the Arabic face: keep every
# feature, no exceptions. The size cost is a few KB; the failure mode it
# prevents is shipping unreadable Arabic.
#
# On the mono face we deliberately DROP calt/liga/dlig/clig. That is where
# JetBrains Mono keeps its coding ligatures, and CLAUDE.md forbids rendering
# code as anything other than the characters typed: `->` must be a hyphen and
# a greater-than sign, never an arrow glyph. CSS font-variant-ligatures:none
# is belt; this is braces.
#
# U+200C-200F (ZWNJ, ZWJ, LRM, RLM) are retained on purpose. They are the
# bidi control characters an RTL site needs to isolate LTR runs correctly.

set -euo pipefail
cd "$(dirname "$0")/.."

SRC=vendor/fonts
OUT=public/fonts
mkdir -p "$OUT" "$SRC"

# Sources are gitignored — only the subsets are committed. Fetch on demand so
# this script is reproducible from a clean checkout.
PLEX=https://raw.githubusercontent.com/IBM/plex/master/packages/plex-sans-arabic/fonts/complete/ttf
JBM=https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip

for w in Regular Medium SemiBold; do
  [ -f "$SRC/IBMPlexSansArabic-$w.ttf" ] || {
    echo "  fetching IBMPlexSansArabic-$w.ttf"
    curl -sfL -o "$SRC/IBMPlexSansArabic-$w.ttf" "$PLEX/IBMPlexSansArabic-$w.ttf"
  }
done
[ -f "$SRC/jbm/fonts/ttf/JetBrainsMono-Regular.ttf" ] || {
  echo "  fetching JetBrains Mono 2.304"
  curl -sfL -o "$SRC/jbm.zip" "$JBM"
  unzip -oq "$SRC/jbm.zip" 'fonts/ttf/JetBrainsMono-Regular.ttf' \
    'fonts/ttf/JetBrainsMono-Bold.ttf' -d "$SRC/jbm"
}

# Latin-1, Arabic + Supplement + Extended-A, bidi controls, general punctuation.
ARABIC_UNICODES='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0600-06FF,U+0750-077F,U+08A0-08FF,U+200C-200F,U+2010-2027,U+2030-205E,U+2060,U+20A0-20BF,U+2122,U+2212,U+FEFF'

# ASCII plus the symbols that appear in compiler and cargo output.
MONO_UNICODES='U+0000-00FF,U+200C-200F,U+2010-2027,U+2030-205E,U+2060,U+2190-2193,U+2500-257F,U+2713-2717,U+26A0,U+FEFF'

echo "── Arabic: IBM Plex Sans Arabic ──"
for w in Regular:400 Medium:500 SemiBold:600; do
  name="${w%%:*}"; weight="${w##*:}"
  pyftsubset "$SRC/IBMPlexSansArabic-$name.ttf" \
    --output-file="$OUT/plex-arabic-$weight.woff2" \
    --flavor=woff2 \
    --unicodes="$ARABIC_UNICODES" \
    --layout-features='*' \
    --notdef-outline \
    --recalc-bounds
  printf "  %-28s %6s KB\n" "plex-arabic-$weight.woff2" \
    "$(( $(stat -c%s "$OUT/plex-arabic-$weight.woff2") / 1024 ))"
done

echo "── Mono: JetBrains Mono (ligatures removed) ──"
for w in Regular:400 Bold:700; do
  name="${w%%:*}"; weight="${w##*:}"
  pyftsubset "$SRC/jbm/fonts/ttf/JetBrainsMono-$name.ttf" \
    --output-file="$OUT/jetbrains-mono-$weight.woff2" \
    --flavor=woff2 \
    --unicodes="$MONO_UNICODES" \
    --layout-features=ccmp,kern,mark,mkmk,locl,zero \
    --notdef-outline \
    --recalc-bounds
  printf "  %-28s %6s KB\n" "jetbrains-mono-$weight.woff2" \
    "$(( $(stat -c%s "$OUT/jetbrains-mono-$weight.woff2") / 1024 ))"
done

echo
echo "Now run: python3 scripts/verify-fonts.py"
echo "It fails if any Arabic shaping feature was lost, or if a mono ligature survived."
