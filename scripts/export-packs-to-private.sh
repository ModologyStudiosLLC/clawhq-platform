#!/usr/bin/env bash
# Copies the packs/ directory to a separate private repo.
# Run this BEFORE making clawhq-platform public.
#
# Usage:
#   ./scripts/export-packs-to-private.sh ~/path/to/clawhq-packs-private
#
# Then in the private repo:
#   git init && git add . && git commit -m "Initial packs import"
#   gh repo create ModologyStudiosLLC/clawhq-packs --private --push

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST="${1:-}"

if [[ -z "$DEST" ]]; then
  echo "Usage: $0 <destination-directory>"
  echo "Example: $0 ~/Desktop/clawhq-packs-private"
  exit 1
fi

echo "→ Copying packs/ to $DEST"
mkdir -p "$DEST"
cp -r "$REPO_ROOT/packs/." "$DEST/"

cat > "$DEST/README.md" << 'EOF'
# ClawHQ Packs (Private)

Premium agent packs for ClawHQ. Not included in the public repo.

To use: copy a pack YAML into your ClawHQ `~/.clawhq/agents/` directory
and run `docker compose restart paperclip`.
EOF

echo "✓ Packs exported to $DEST"
echo ""
echo "Next steps:"
echo "  1. cd $DEST"
echo "  2. git init && git add . && git commit -m 'Initial packs import'"
echo "  3. gh repo create ModologyStudiosLLC/clawhq-packs --private --source=. --push"
echo "  4. Come back here and run: git rm -r --cached packs/ && echo 'packs/' >> .gitignore"
