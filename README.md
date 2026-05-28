# project-reset-templates

Copier templates for the `/project-reset` Claude Code skill.

## Use via the skill (recommended)

Run `/project-reset` inside Claude Code. The skill drives Copier for you.

## Use directly (without the skill)

```bash
copier copy gh:FCisco95/project-reset-templates <target-dir> \
  --data-file archetypes/full-product.copier.yml
```

## Update an existing scaffolded project to a newer template version

```bash
cd <your-project>
copier update
```

## Archetypes

- `full-product` — opinionated agentic-ready bundle (NORTH-STAR, TASKS, docs, .claude/, hooks)
- `research-spike` — lighter (NORTH-STAR, NOTES, sources/)
- `script` — minimal (overlay + .claude/)
- `skill` — Claude Code skill scaffold (SKILL.md + references/)

## Versioning

Tagged releases drive `copier update`. Pin via `copier copy --vcs-ref=v1.0.0 ...`.
