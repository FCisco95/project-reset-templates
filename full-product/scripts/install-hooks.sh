#!/usr/bin/env bash
set -euo pipefail

# Install git hooks for this project.
# Run once per machine: bash scripts/install-hooks.sh

HOOKS_DIR=".githooks"
mkdir -p "$HOOKS_DIR"

# pre-commit: copy AGENTS.md -> CLAUDE.md (cross-tool support)
cat > "$HOOKS_DIR/pre-commit" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
if [ -f "AGENTS.md" ]; then
  cp -f AGENTS.md CLAUDE.md
  git add CLAUDE.md
fi
HOOK
chmod +x "$HOOKS_DIR/pre-commit"

git config core.hooksPath "$HOOKS_DIR"
echo "✓ Hooks installed (core.hooksPath=$HOOKS_DIR)"
