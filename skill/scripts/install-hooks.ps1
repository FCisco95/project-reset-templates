# Install git hooks for this project.
# Run once per machine: powershell -ExecutionPolicy Bypass -File scripts/install-hooks.ps1

$ErrorActionPreference = "Stop"
$hooksDir = ".githooks"
if (-not (Test-Path $hooksDir)) { New-Item -ItemType Directory -Path $hooksDir | Out-Null }

$preCommit = @'
#!/usr/bin/env bash
set -euo pipefail
if [ -f "AGENTS.md" ]; then
  cp -f AGENTS.md CLAUDE.md
  git add CLAUDE.md
fi
'@
Set-Content -Path "$hooksDir/pre-commit" -Value $preCommit -Encoding utf8 -NoNewline:$false

git config core.hooksPath $hooksDir
Write-Host "[OK] Hooks installed (core.hooksPath=$hooksDir)"
