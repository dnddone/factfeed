# exec-plans

Phased execution plans derived from an **Approved** design doc.

```
exec-plans/
  active/      # in-flight plans
  completed/   # all phases Done — moved here
```

- **Filename**: `YYYY-MM-DD-short-description.md`.
- A plan is a sequence of **phases**. Each phase is a self-contained,
  independently mergeable change (think PR, not commit) that does not break the
  app when merged alone.
- Each phase is a `##` section with a `**Status:**` marker: `Not Started`,
  `In Progress`, or `Done`.
- When every phase is `Done`, move the file from `active/` to `completed/`.
