# eslint-config

Shared ESLint flat config. Consumer-facing docs are in `README.md`; this file is the
design rationale behind the rules, for anyone changing them.

## Surprises

- **Plain ESM `.js`, no build step, no `dist/`.** A sibling package would normally compile TS to
  `dist/` and publish that. This one does not: ESLint flat configs are loaded as JS by ESLint
  itself, and a build step only adds a way for the published config to disagree with the source.
  `files` in `package.json` ships `index.js`, `plugin.js` and `rules/` verbatim.
- **A rule here is only allowed to encode a convention that is already written down.** The value
  is that the doc and the check cannot drift; a lint rule with no doc behind it is a new house rule
  invented by whoever was on shift. Adding a rule means writing the convention down first, and
  giving the rule a `docsUrl` option so a consumer can point at their own.
- **`us-spelling` uses an explicit word map, never an `-ise`/`-ize` pattern.** A pattern flags
  `enterprise`, `surprise`, `advertise` and `otherwise`, all of which are correct US English. The
  map is the reason the rule is usable at `error`.
- **`require-leading-with-text-size` must tell a size from a color.** `text-[0.8125rem]` is the bug;
  `text-[oklch(...)]` is a color and needs no line height. `isLength` is what separates them - a
  naive `text-\[` match makes the rule unusable. **An unhinted variable is a color**:
  Tailwind reads `text-[var(--x)]` and `text-(--x)` as `color`, and only a `length:` hint makes one a
  size. Until 1.1.1 the rule called `var()` a size, and the "fix" it prompted
  (`text-[var(--chart-2)]/[1.5]`) compiled to an invalid 150% color-mix that dropped the color.
- **`no-property-shorthand` exists because the built-in `object-shorthand` is a near-miss.** Its
  `"never"` setting also bans METHOD shorthand (`create(ctx) {}`), which the convention never
  asked for and which is the mandatory idiom for an ESLint visitor - the config could not lint
  itself.
  The custom rule checks `parent.type === "ObjectExpression"`, which is also what keeps it off
  destructuring and imports; both parse as shorthand `Property` nodes and both are exempt.
