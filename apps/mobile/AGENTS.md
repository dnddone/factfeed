# factfeed mobile — Claude Instructions

Expo (React Native) app for the swipeable facts feed. **Expo SDK 54** — read
the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before
writing any code; the API surface changes between SDK versions, and this
project deliberately targets 54, not the newest SDK — the App Store build of
Expo Go lags a couple of SDK versions behind, and this app needs to run in
both the Simulator and physical-device Expo Go.

Adapted from the web-app React conventions for Expo/React Native — same
principles, native equivalents where the DOM doesn't apply. Cross-cutting
conventions (commits, TypeScript, naming, destructuring, testing, docs
workflow) live in the repo-root `AGENTS.md` — this file covers only what's
specific to `apps/mobile`.

## Source layout

```
app/                 # Expo Router routes (file-based, project root, un-aliased)
src/                  # everything else — aliased as @/*
  components/
    shared/             # generic primitives, zero domain knowledge: Button, Card
    <top-level>.tsx     # cross-screen, domain-specific: SwipeDeck, FactCard
    <ScreenName>/        # single-screen components — created only once one exists
  hooks/                # custom hooks
  providers/            # React context providers
  clients/              # third-party client instantiation (API client, analytics)
  utils/                # shared, abstract utilities (type guards, animation helpers)
  utils/helpers/        # domain-scoped helpers — not barrel-exported
  types/                # shared local types not tied to packages/contract
  content/              # structured UI data paired with i18n keys (see "Content")
```

`app/` stays at the project root (Expo Router requirement); everything else
lives under `src/`, imported via the `@/*` alias — e.g. `@/hooks/useFeed`, not
a relative `../../hooks/useFeed`.

## Components

Three tiers, by reach — not by whether a component is a "primitive" vs.
"composed":

- **`components/shared/`**: generic primitives with zero domain knowledge —
  reusable in any RN app (`Button`, `Card`, `Input`). `forwardRef` for refs,
  extend the underlying RN component's own props type (`ViewProps`,
  `TextProps`, `PressableProps`, ...) instead of `HTMLAttributes`.
- **`components/` (top level)**: cross-screen but domain-specific
  (`SwipeDeck`, `FactCard`) — knows about facts/swipes, but isn't tied to one
  screen. Use the compound component pattern (shared context + subcomponents)
  for anything with multiple coordinated pieces, instead of one component
  with many render props or booleans.
- **`components/<ScreenName>/`**: used by exactly one screen. Don't create
  this tier speculatively — start the component inline in the screen file
  under `app/`, and only extract it into `components/<ScreenName>/` once it
  exists and is clearly single-screen-only.
- **Routing**: Expo Router. Route files under `app/` only compose
  hooks/components — no business logic, same rule as the web app's
  page-level views.
- **File organization** (new files, not a retrofit of existing ones):
  - `index.ts` is for imports/exports only — never define a component inside it.
  - One component per file by default.
  - A compound component's subcomponents each get their own file.
  - Don't nest a folder that would only contain one component file plus an
    `index.ts` — flatten to a sibling file instead. Use a folder only when the
    component has real siblings (subcomponents, its own hook, types):

    ```
    Incorrect — redundant folder + index
    src/components/SwipeDeck/
      SwipeDeck.tsx
      index.ts

    Correct — flat file (no siblings yet)
    src/components/SwipeDeck.tsx

    Correct — folder, because it has siblings
    src/components/SwipeDeck/
      SwipeDeck.tsx
      SwipeDeckCard.tsx
      useSwipeDeck.ts
      index.ts
    ```
- Component props type is always named `Props`, declared directly above the
  component it belongs to. Type components with `React.FC<Props>`.
- Avoid boolean props that toggle behavior (`isEditing`, `showFooter`) —
  each one doubles the states the component has to handle. Prefer
  composition or an explicit variant component instead.

## Types

- Component `Props` and types used only within one file stay local to that
  file (unexported, for the latter). Everything broader belongs in
  `src/types/` — add to an existing domain file if one fits, otherwise
  `src/types/shared.ts`; only create a new file when the concept is broad
  enough to grow. Shapes shared with the backend still come from
  `packages/contract`, never redefined here.
- **Object arguments use a named type** — never an inline object literal in a
  hook or utility signature, same rule as `apps/api`.
- **Type guards**: use named guard utilities from `src/utils/` (`isString`,
  `isNumber`, `isBoolean`, `isNullable`, `isObject`, `isArray`, `isFunction`)
  instead of raw `typeof`/`Array.isArray` checks inline.

## Content

`src/content/` holds structured UI data that pairs a value with an i18n
key — option lists, lookup tables, anything beyond a single string. Plain
copy still goes through `react-i18next` directly in the component;
`content/` is only for structured data. One file per concern, named
`<concern>.content.ts`. Unlike `constants/` (MACRO_CASE, logic values),
`content/` exports stay camelCase — they're consumed as UI data, not logic:

```ts
export const categoryFilterOptions = [
  { value: "science", labelKey: "categories.science" },
  { value: "history", labelKey: "categories.history" },
] as const;
```

## Providers

Pattern: `src/providers/<feature>-provider.tsx` — define a `State` type
(getters + setters), `createContext<State>()`, export the provider component
plus a `useX()` hook that throws if called outside the provider.

## Styling

NativeWind + `tailwind-variants` (`tv()`) — same authoring pattern as the web
app, className strings via NativeWind, `tv()` for variants instead of boolean
props:

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

## State & data

- **State**: React Query v5 for server state (`["resource", id]` query
  keys), Context API for global UI state, `useState` for local state — none
  of this is DOM-dependent, same as web.
  - React Query's browser-only defaults don't apply on RN — there's no
    `window` or `navigator.onLine`. Wire `focusManager` to `AppState` and
    `onlineManager` to `@react-native-community/netinfo` once in the tRPC/RQ
    client setup (`src/clients/`), instead of a `refetchOnWindowFocus` option.
- **Data-access functions** (hooks wrapping tRPC calls) are async, typed, no
  classes, and let read errors surface to React Query rather than
  catch-and-swallow. The one documented exception is the `swipe.record`
  fire-and-forget mutation (design doc "Edge cases") — catch, log, don't
  roll back the UI, since the card has already animated off-screen.
- **Contract**: never redefine request/response shapes for API calls —
  import from `packages/contract`. Local component prop types stay local.
- Transform snake_case external data (e.g. Supabase's `user_metadata`,
  `created_at`) to camelCase at the boundary — same rule as `apps/api`.

## Performance

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

## i18n

`react-i18next`, no hardcoded UI text. If a translation key is built
dynamically, add an `i18next-scanner` comment block listing every possible
key so the scanner can find them.

## Error/toast UI

**Explicitly deferred** — no toast library chosen yet. Until then, failures
follow the design doc's default: catch, log, no user-facing surface. Revisit
once a real need for user-facing feedback shows up.
