# factfeed — Claude Instructions

Swipeable facts feed (Tinder/Reels-style). Facts are generated on the backend,
ranked by engagement, and served to a React Native client. Swipe right = like,
left = dislike, down = next.

> `factfeed` is a working codename. The public brand is decided closer to
> launch. Renaming is a find-replace on the codename — don't block work on it.

This is a **standalone** project. Everything project-wide lives here.

## Commits

Follow conventional commits. Subject line: 50 chars max, compact. Use a
multiline body only when extra context is needed.

```
feat: add swipe endpoint
fix: correct wilson score for zero-vote posts

feat: add fact generation job

Tops up the global pool with Claude-generated
facts when a user's unseen count drops below 5.
```

## Commands

Always use pnpm scripts and turbo. Never run raw binaries.

```bash
pnpm install        # install all workspaces
pnpm dev            # run all apps in dev (turbo)
pnpm build          # build all
pnpm lint           # lint all
pnpm typecheck      # type-check all
pnpm test           # run tests (turbo)
pnpm format         # prettier --write the repo
```

Per-workspace: `pnpm --filter @factfeed/api <script>`.

## Post-task checklist

After finishing edits, format and type-check the affected workspace:

```bash
pnpm format
pnpm --filter <workspace> typecheck
```

## Project Structure

pnpm + Turborepo monorepo.

```
apps/
  mobile/        # Expo React Native app (frontend — deferred for now)
  api/           # Next.js backend: route handlers, jobs, DB access
packages/
  contract/      # shared TS types + zod schemas — the API contract
  config/        # shared tsconfig / lint config
docs/            # see "Documentation and Planning" below
```

- `apps/api` deploys independently (e.g. Vercel, root = `apps/api`).
- `packages/contract` is the single source of truth for request/response
  shapes. Both `api` and `mobile` import it — the contract must never be
  duplicated by hand.
- Deep-import from libraries; avoid barrel files on hot paths.

### Source layout (`apps/api`, `apps/mobile`)

No catch-all `lib/`. Split by purpose instead:

- `utils/` — pure, stateless helper functions (type guards, formatting,
  math). No side effects, no I/O.
- `clients/` — third-party client instantiation (SDK/API clients, analytics)
  and the settings that configure them (e.g. the Prisma client, the
  Anthropic client). Distinct from `packages/config` (shared tsconfig/lint
  config for the monorepo).
- `constants/` — app-wide constants not tied to a specific third-party
  client (e.g. env flags like `IS_PRODUCTION`). One file per concern, named
  `<concern>.constants.ts` (e.g. `app.constants.ts`) — never a single
  flat `constants.ts`.
- Business-logic / data-access modules stay flat at the app's own top level
  (e.g. `apps/api/src/ranking.ts`) — don't invent a folder for them until
  there are enough to warrant one.

### API layer (`apps/api`)

- Data-access functions are async, typed, no classes.
- Object arguments use a named type — never an inline object literal in the
  signature. Keep shared request/response types in `packages/contract`.
- Validate all external input (request bodies, generation output) with the zod
  schemas from `packages/contract` at the boundary.
- Transform snake_case external data to camelCase at the boundary.

### Mobile app (`apps/mobile`)

Adapted from the web-app React conventions for Expo/React Native — same
principles, native equivalents where the DOM doesn't apply.

```
app/                 # Expo Router routes (file-based) — thin, no business logic
components/
  base/               # primitives: Button, Card, etc.
  module/             # composed: SwipeDeck, FactCard, etc.
hooks/                # custom hooks
context/              # React context providers
clients/              # third-party client instantiation (API client, analytics)
utils/                # shared utilities (type guards, animation helpers)
```

- **Routing**: Expo Router. Route files under `app/` only compose
  hooks/components — no business logic, same rule as the web app's
  page-level views.
- **`base/`**: reusable primitives, `forwardRef` for refs, extend the
  underlying RN component's own props type (`ViewProps`, `TextProps`,
  `PressableProps`, ...) instead of `HTMLAttributes`.
- **`module/`**: composed from `base/` components. Use the compound
  component pattern (shared context + subcomponents) for anything with
  multiple coordinated pieces, instead of one component with many render
  props or booleans.
- Component props type is always named `Props`, declared directly above the
  component it belongs to. Type components with `React.FC<Props>`.
- Avoid boolean props that toggle behavior (`isEditing`, `showFooter`) —
  each one doubles the states the component has to handle. Prefer
  composition or an explicit variant component instead.
- **Styling**: NativeWind + `tailwind-variants` (`tv()`) — same authoring
  pattern as the web app, className strings via NativeWind, `tv()` for
  variants instead of boolean props:

  ```tsx
  const button = tv({
    base: "flex-row items-center rounded-lg px-4 py-2",
    variants: {
      variant: { primary: "bg-blue-600", ghost: "bg-transparent" },
    },
    defaultVariants: { variant: "primary" },
  });

  type Props = PressableProps & VariantProps<typeof button>;

  const Button: React.FC<Props> = ({ variant, className, ...props }) => (
    <Pressable className={button({ variant, className })} {...props} />
  );
  ```

- **State**: React Query v5 for server state (`["resource", id]` query
  keys), Context API for global UI state, `useState` for local state — none
  of this is DOM-dependent, same as web.
- **Contract**: never redefine request/response shapes for API calls —
  import from `packages/contract`. Local component prop types stay local.
- **Performance**:
  - Extract expensive child work into a `memo()`-wrapped component so a
    parent can early-return (e.g. a loading state) before the child
    computes anything.
  - Effect dependencies: depend on primitives (`user.id`), not objects
    (`user`) — avoids re-running on unrelated field changes.
  - Derive state during render instead of syncing it with a `useEffect` +
    extra `useState`.
  - `Promise.all()` independent async calls — never await them
    sequentially.
  - Import icons/utilities directly from their source file, not the
    package barrel — barrel imports slow Metro bundling and cold start.
- **i18n**: `react-i18next`, no hardcoded UI text. If a translation key is
  built dynamically, add an `i18next-scanner` comment block listing every
  possible key so the scanner can find them.

Testing setup and error/toast UI conventions for mobile aren't decided yet
— revisit once mobile work actually starts.

## TypeScript

- Strict mode on (`noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, no `any`).
- Prefer `type` over `interface`. Prefer arrow functions.
- Descriptive names; single-letter only for `for` loop indices.
- Always use block syntax for conditionals — no inline single-line `if`.
- Always use multiline `/** */` block comments, even for a single line of
  text. Never use `//` or single-line `/** ... */`, except `eslint-disable` /
  `@ts-*` directives:

  **Incorrect:**

  ```ts
  /** Values are i18n keys */
  ```

  **Correct:**

  ```ts
  /**
   * Values are i18n keys
   */
  ```

## Destructuring

Prefer destructuring. Choose the pattern based on whether you need the full object:

**Only need fields** — destructure in params:

```ts
const handleSubmit = ({ foo, bar }: Data) => {
  fn({ id: foo });
};
```

**Need full object + one field inline** — keep param, dot-access:

```ts
const renderItem = (item: Item) => ({ key: item.id, item });
```

**Need derived values + full object** — keep param, destructure in body:

```ts
const renderItem = (item: Item) => {
  const { id, time } = item;
  const formattedTime = dayjs(time).format("l");
  return { key: id, formattedTime, onClick: () => handleClick(item) };
};
```

**Need full object + multiple fields** — keep param, destructure in body:

```ts
const handleSubmit = (data: Data) => {
  const { foo, bar, ...rest } = data;
  fn(rest);
  fn2({ id: foo, payload: data });
  onSubmit(data);
};
```

When destructuring in a nested scope would shadow an outer variable, resolve
the naming conflict explicitly — never silently shadow. Pick whichever
rename makes the intent clearest:

**Incorrect** — inner `value` silently shadows outer `value`:

```ts
const comp = ({ value }: Props) => array.filter(({ value }) => value === value);
```

**Option A** — rename the inner binding with an alias:

```ts
const comp = ({ value }: Props) =>
  array.filter(({ value: itemValue }) => itemValue === value);
```

**Option B** — give the outer param a more specific name:

```ts
const comp = ({ value: targetValue }: Props) =>
  array.filter(({ value }) => value === targetValue);
```

**Option C** — rename the outer param outright when the context makes it clearer:

```ts
const fn = (targetValue: string) =>
  Object.values(object).map((value) => value === targetValue);
```

## Naming

- camelCase for variables, functions, properties.
- MACRO_CASE for fixed module-level constants (config, keys, formats, lookups).
- Runtime-computed values stay camelCase even when `const`.

## Testing

- Vitest. Tests colocated in `__tests__/` next to source.
- Filename: `<module>.test.ts`.
- Keep tests simple — avoid unnecessary abstraction.
- **`apps/mobile` is exempt during active development** — do not write tests
  for the mobile app while it's being actively built. Postponed by decision;
  revisit once the app stabilizes. (Backend and `packages/*` are still tested
  as usual.)

## Documentation and Planning

Project docs live in `docs/`. Each tier has a `README.md` describing its
contract — read it before adding files.

| If you need…                                     | Load                                  |
| ------------------------------------------------ | ------------------------------------- |
| Product requirements                             | `docs/product-specs/`                 |
| Design docs                                      | `docs/design-docs/`                   |
| Execution plans                                  | `docs/exec-plans/{active,completed}/` |
| Untriaged ideas / expanded TODOs                 | `docs/inbox/`                         |
| Time-bound investigations / evaluations / spikes | `docs/research/`                      |
| Architectural Decision Records                   | `docs/decisions/`                     |

### Workflow

0. **Inbox** (optional — only when the task started as an untriaged idea):
   triage it first following `docs/inbox/README.md`. Direct requests and
   already-specified work skip Step 0.
   - **Research** (optional — only when we don't yet know enough to propose a
     specific change): investigate in `docs/research/<YYYY-MM>-<slug>/`. Outcome
     may promote to an ADR in `docs/decisions/` and/or a design doc.
1. **Product spec** (if one exists): read the requirements in
   `docs/product-specs/`.
2. **Design document**: create a design doc in `docs/design-docs/` with a status
   marker: `**Status:** Draft` (under review) or `**Status:** Approved`.
3. **Execution plan**: only after the design doc is **Approved**, create an
   execution plan in `docs/exec-plans/active/`.

### Design document format

- **Filename**: `YYYY-MM-DD-short-description.md`.
- Must include `**Date:**` and `**Status:**` at the top.
- Sections typically cover: problem, design overview, component/route changes,
  API/contract changes, data flow, migration strategy, edge cases, and a file
  impact summary.

### Execution plan format

- **Filename**: `YYYY-MM-DD-short-description.md`.
- A sequence of phases, each a **self-contained, independently mergeable
  change** (think PR, not commit). A phase must not break the app when merged
  alone.
- Each phase is a `##` section with a `**Status:**` marker (`Not Started`,
  `In Progress`, `Done`).
- **Completion**: when all phases are `Done`, move the file from
  `docs/exec-plans/active/` to `docs/exec-plans/completed/`.

## Important process rules

- **If you discover a new rule during development, add it to this file before
  finishing** (or to the right `docs/` file if it's a design or planning
  artifact). Don't let project-wide knowledge live only in conversation history.
- **After every correction from the user, ask: is this specific to this line, or
  a general pattern?** If general, extract it into this file immediately.
- **Record architectural insights and verified facts** — when you investigate a
  dependency's behavior, write it down in the appropriate `docs/` location
  instead of relying on memory.
