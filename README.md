# @mslmio/eslint-config

Shareable ESLint **flat config** plus a small plugin of house rules — the kind of convention
teams write down and then enforce with nothing.

```sh
pnpm add -D @mslmio/eslint-config eslint
```

## Use it

```js
// A backend service or a non-UI library - installs no Tailwind/React tooling.
import { lib, typeChecked } from "@mslmio/eslint-config";
export default [...lib, typeChecked(import.meta.dirname)];

// Anything rendering Tailwind. Needs @shadcn/lint (and eslint-plugin-react-hooks
// for uiLib) installed alongside - both are OPTIONAL peers.
import { uiLib } from "@mslmio/eslint-config/ui";
export default [...uiLib];
```

**Two entry points on purpose.** A backend service has no Tailwind and no React, so keeping the
UI half behind `/ui` means the root entry resolves neither `@shadcn/lint` nor
`eslint-plugin-react-hooks`, nor `oxc-parser`'s native binaries.

| Preset | For | Adds |
|---|---|---|
| `house` | anything TS/JS | `no-property-shorthand`, `curly: all`, `us-spelling`, `no-express-json-spaces` |
| `lib` | a published library | house + `no-lib-process-env`, `no-module-scope-init` |
| `ui` | anything rendering Tailwind | house + `require-leading-with-text-size`, `prefer-copy-icon` |
| `uiLib` | a published UI library | `lib` + `ui` |

## Rules

| Rule | What it says |
|---|---|
| `no-upward-import` | A package may not import a tier above it, or a sibling leaf. Off until configured — see below |
| `no-property-shorthand` | Always `{ key: key }`; exempts destructuring and imports |
| `no-lib-process-env` | A library never reads `process.env` — configuration is passed in |
| `no-module-scope-init` | No client/config built at module scope; build lazily and memoise |
| `no-express-json-spaces` | Express's `json spaces` indents but drops the trailing newline |
| `prefer-copy-icon` | lucide `Copy`, not `Clipboard` |
| `us-spelling` | US spelling in prose and identifiers |
| `require-leading-with-text-size` | An arbitrary Tailwind text size must state its own line height |

`us-spelling` skips regex literals — a pattern matching scraped text has to accept both
spellings — and takes `allow` for proper names that keep their own:
`["mslmio/us-spelling", "error", { allow: ["Macquarie Data Centres"] }]`.

`no-lib-process-env` exempts `main.*` by default: a runnable entry point living in a library
directory IS the service. Override with `{ entryPoints: [...] }`.

Every rule that explains itself takes an optional `docsUrl`, appended to the message so you can
point at your own write-up: `["mslmio/no-lib-process-env", "error", { docsUrl: "https://..." }]`.

## `no-upward-import`

A workspace layered into **ordered tiers** plus any number of **leaves**. A tier may import the
tiers below it; a leaf may import every tier but no other leaf. Nothing reaches up.

```js
["mslmio/no-upward-import", "error", {
    tiers: ["base", "platform"],   // ordered, lowest first
    exempt: ["tools"],             // outside the layering entirely
    typeDirs: ["svc", "lib", "web"],
    docsUrl: "https://example.com/layering",
}]
```

**It is a no-op until `tiers` is set**, which is the default. The leaves are *discovered* from the
workspace root — the directory holding every tier as a child — rather than listed: any other child
containing one of `typeDirs` is a leaf. So adding a leaf needs no config change, and no package has
to hold a list of its siblings.

## Ignores

`house`, and so every preset, globally ignores `.design-sync/**`, `.ds-sync/**` and
`ds-bundle/**`. Flat config does not read `.gitignore`, and these hold symlinks into app
components — one moved component leaves a dangling link and `eslint .` exits `ENOENT` instead of
reporting anything.

## License

MIT
