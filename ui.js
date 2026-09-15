// The Tailwind + React half, behind its own entry point.
//
// A backend service has no Tailwind and no React. Keeping these behind their own
// entry point means the root entry installs neither @shadcn/lint nor
// eslint-plugin-react-hooks (nor oxc-parser's native binaries), and a service that
// imports only the root never resolves them.
//
//   import { ui } from "@mslmio/eslint-config/ui";
import shadcn from "@shadcn/lint";
import reactHooks from "eslint-plugin-react-hooks";

import { house, lib } from "./index.js";

// Tailwind class hygiene. `cn`, `clsx`, `cva`, `twMerge` and `twJoin` are already
// built-in merge functions, so only the component packages need naming.
export const shadcnUi = [
    {
        files: ["**/*.tsx", "**/*.ts"],
        plugins: { shadcn: shadcn },
        settings: {
            // EMPTY by default: which packages are the component library is the
            // consumer's fact, not this config's. Append a later flat-config entry
            // setting `settings.shadcn.componentImports` to declare them.
            shadcn: { componentImports: [] },
        },
        rules: {
            // `allow: ["layout"]` is the plugin's own documented adoption setting, and it
            // matches how our library is actually built: Panel, PanelBody and friends take
            // `className` and merge it with `cn()`, so external composition is their API.
            // Typography, color and internal spacing stay errors - that is the drift
            // this rule set exists to stop.
            // WARN, not error, and deliberately so: these landed on a codebase with a
            // real backlog (~1,340 at adoption), and clearing it needs design decisions
            // rather than effort - component variants in the library, and a named
            // typographic scale where clamp()/ch have no Tailwind equivalent. A red
            // `pnpm lint` nobody can fix is a lint nobody reads. Ratchet per app to
            // "error" as each backlog clears.
            "shadcn/no-restyle": ["warn", { allow: ["layout"] }],
            "shadcn/no-raw-colors": "warn",
            "shadcn/no-arbitrary-values": "warn",
            "shadcn/no-inline-styles": "warn",
            "shadcn/require-static-classes": "warn",
            "shadcn/no-unknown-classes": "warn",
        },
    },
];

export const ui = [
    ...house,
    ...shadcnUi,
    {
        files: ["**/*.tsx", "**/*.ts"],
        rules: {
            "mslmio/require-leading-with-text-size": "error",
            "mslmio/prefer-copy-icon": "error",
        },
    },
];

// A published React component library. The hook rules are not decoration: a
// rebuilt dependency can silently disable a memo other code relied on.
export const uiLib = [
    ...lib,
    ...ui,
    {
        files: ["**/*.tsx", "**/*.ts"],
        plugins: { "react-hooks": reactHooks },
        rules: {
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
        },
    },
];

export default { shadcnUi: shadcnUi, ui: ui, uiLib: uiLib };
