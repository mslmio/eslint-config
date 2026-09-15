import plugin from "./plugin.js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const TS_GLOBS = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.js", "**/*.mjs"];

// design-sync scratch and its generated bundle. All three are gitignored, and `ds-src` holds
// symlinks that dangle the moment a component moves - which makes `eslint .` exit on ENOENT
// rather than report. Flat config does not read .gitignore, so every consumer needs this.
export const designSyncIgnores = {
    ignores: [".design-sync/**", ".ds-sync/**", "ds-bundle/**"],
};

// The @typescript-eslint rule set. Without this the parser parses TypeScript and
// NOTHING lints it - no unused vars, no floating promises, no unsafe any. The rules
// go in `house` (so every consumer gets them) while the PARSER stays out of it, since
// a Next app already has one and flat config is last-wins.
// The `plugins` key is stripped on purpose. A flat-config plugin namespace may be
// declared only ONCE across the whole array, and eslint-config-next already declares
// `@typescript-eslint`; redeclaring it fails the whole run with "Cannot redefine
// plugin". Rules resolve against whichever config declared the namespace - next's in
// an app, the `typescript` config below in a standalone package.
export const typescriptRules = (tsPlugin.configs["flat/recommended"] ?? []).map((c) => {
    const { plugins: _plugins, ...rest } = c;
    return { ...rest, files: ["**/*.ts", "**/*.tsx", "**/*.mts"] };
});

// Scoped to TS files, not folded into `house`: `house` also matches .js/.mjs, where
// the @typescript-eslint namespace is not declared and naming one of its rules fails
// the whole run. A leading underscore is how you say "deliberately discarded".
typescriptRules.push({
    files: ["**/*.ts", "**/*.tsx", "**/*.mts"],
    rules: {
        "@typescript-eslint/no-unused-vars": ["error", {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_",
        }],
    },
});

// Every rule here encodes a documented house rule. Adding one means editing
export const house = [
    designSyncIgnores,
    ...typescriptRules,
    {
        files: TS_GLOBS,
        plugins: { mslmio: plugin },
        rules: {
            "mslmio/no-property-shorthand": "error",
            curly: ["error", "all"],
            "mslmio/us-spelling": "error",
            "mslmio/no-express-json-spaces": "error",
            "mslmio/no-upward-import": "error",
        },
    },
];

// A parser for `.ts`/`.tsx`, for a package that has no framework config supplying one.
// Deliberately NOT in `house`/`ui`: a Next app gets its parser from eslint-config-next,
// and flat config is last-wins, so adding one here would silently replace theirs.
export const typescript = {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts"],
    plugins: { "@typescript-eslint": tsPlugin },
    languageOptions: {
        parser: tsParser,
        parserOptions: { ecmaFeatures: { jsx: true } },
    },
};

// Type-aware rules, opt-in per package because they need that package's tsconfig.
//
//   import { uiLib, typeChecked } from "@mslmio/eslint-config";
//   export default [...uiLib, typeChecked(import.meta.dirname)];
//
// Deliberately NOT the full `recommended-type-checked`: the no-unsafe-* family reports
// every read off an `any`, which on a codebase with untyped edges is thousands of hits
// that bury these four. These catch real bugs - an un-awaited promise silently does
// nothing, and a promise in a boolean position is always truthy.
export function typeChecked(tsconfigRootDir, extraProjectOptions = {}) {
    return {
        files: ["**/*.ts", "**/*.tsx", "**/*.mts"],
        // Type-aware rules need the file to be in a tsconfig project. Tests and tool
        // configs are routinely NOT - a separate tsconfig.test.json, or nothing at all -
        // and the parser then fails the file outright rather than skipping it.
        // `allowDefaultProject` is not the answer: it errors the other way round for a
        // package whose tests ARE in the project, so it cannot be a shared default.
        // They still get every non-type-aware rule from `typescript`.
        ignores: ["**/*.test.ts", "**/*.test.tsx", "**/*.config.ts", "**/*.config.mts", "**/*.config.js"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: tsconfigRootDir,
                ...extraProjectOptions,
            },
        },
        rules: {
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/require-await": "warn",
        },
    };
}

// A runnable service. Reads process.env and builds clients at startup by design, so
// it gets the house rules and a parser but NOT the library-only bans.
export const svc = [
    typescript,
    ...house,
];

export const lib = [
    typescript,
    ...house,
    {
        files: TS_GLOBS,
        rules: {
            "mslmio/no-lib-process-env": "error",
            "mslmio/no-module-scope-init": "error",
        },
    },
];

export default {
    house: house,
    svc: svc,
    lib: lib,
    typescript: typescript,
    typescriptRules: typescriptRules,
    typeChecked: typeChecked,
    plugin: plugin,
};
