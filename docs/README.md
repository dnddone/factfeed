# docs

Project documentation and planning for factfeed. Standalone — no cross-repo
conventions apply.

## Tiers

| Folder           | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `product-specs/` | What we're building and why — requirements, user outcomes.     |
| `design-docs/`   | How we'll build it — technical design, reviewed then approved. |
| `exec-plans/`    | Phased, mergeable execution plans (`active/` → `completed/`).  |
| `inbox/`         | Untriaged ideas and expanded TODOs awaiting triage.            |
| `research/`      | Time-bound investigations, evaluations, spikes.                |
| `decisions/`     | Architectural Decision Records (ADRs).                         |

## Flow

```
inbox → (research) → product-spec → design-doc (Approved) → exec-plan → code
                         │
                         └── decisions/ (ADRs) capture the "why" at any point
```

Not every change walks the whole chain. Direct, already-specified requests may
start at a design doc or an ADR. See each folder's README for its contract, and
the root `CLAUDE.md` for the full workflow and file formats.
