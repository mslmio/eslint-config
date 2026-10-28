import test from "node:test";
import { RuleTester } from "eslint";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import noLibProcessEnv from "../rules/no-lib-process-env.js";
import noModuleScopeInit from "../rules/no-module-scope-init.js";
import noExpressJsonSpaces from "../rules/no-express-json-spaces.js";
import preferCopyIcon from "../rules/prefer-copy-icon.js";
import usSpelling from "../rules/us-spelling.js";
import requireLeading from "../rules/require-leading-with-text-size.js";
import noPropertyShorthand from "../rules/no-property-shorthand.js";
import noUpwardImport from "../rules/no-upward-import.js";
import preferTableFacets from "../rules/prefer-table-facets.js";
import noInvisibleCharacters from "../rules/no-invisible-characters.js";
import noViewportHeight from "../rules/no-viewport-height.js";

const ts = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: "module" } });
const jsx = new RuleTester({
    languageOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        parserOptions: { ecmaFeatures: { jsx: true } },
    },
});

test("no-lib-process-env", () => {
    ts.run("no-lib-process-env", noLibProcessEnv, {
        valid: [
            { code: "export function f(cfg) { return cfg.url }" },
            { code: "const u = process.env.URL", filename: "/x/main.ts" },
            {
                code: "const u = process.env.URL",
                filename: "/x/bin/cli.ts",
                options: [{ entryPoints: ["bin/cli.ts"] }],
            },
        ],
        invalid: [
            { code: "const u = process.env.URL", errors: [{ messageId: "libReadsEnv" }] },
            { code: "export const f = () => process.env.A ?? 'b'", errors: 1 },
            // An entry point is a whole file name: `main.ts` is not the end of `domain.ts`.
            { code: "const u = process.env.URL", filename: "/x/domain.ts", errors: 1 },
            {
                code: "const u = process.env.URL",
                filename: "/x/mycli.ts",
                options: [{ entryPoints: ["cli.ts"] }],
                errors: 1,
            },
        ],
    });
});

test("no-module-scope-init", () => {
    ts.run("no-module-scope-init", noModuleScopeInit, {
        valid: [
            { code: "let c; export function get() { c ??= createClient(); return c }" },
            { code: "const n = 5" },
            { code: "function f() { const c = createClient(cfg().url) }" },
            // No computed argument: a singleton, not config read at import.
            { code: "const p = connectPool()" },
        ],
        invalid: [
            { code: "export const c = createClient(cfg().url)", errors: [{ messageId: "moduleScopeInit" }] },
            { code: "const p = connectPool(cfg().dsn)", errors: 1 },
            { code: "const t = readToken(process.env.TOKEN)", errors: 1 },
        ],
    });
});

test("no-express-json-spaces", () => {
    ts.run("no-express-json-spaces", noExpressJsonSpaces, {
        valid: ["app.use(prettyJson)", "app.set('trust proxy', 1)"],
        invalid: [{ code: "app.set('json spaces', 2)", errors: [{ messageId: "jsonSpaces" }] }],
    });
});

test("prefer-copy-icon", () => {
    ts.run("prefer-copy-icon", preferCopyIcon, {
        valid: ["import { Copy } from 'lucide-react'", "import { Clipboard } from 'other'"],
        invalid: [
            {
                code: "import { Clipboard } from 'lucide-react'",
                output: "import { Copy } from 'lucide-react'",
                errors: [{ messageId: "useCopy" }],
            },
        ],
    });
});

test("us-spelling", () => {
    ts.run("us-spelling", usSpelling, {
        valid: [
            "const a = 'the datacenter color'",
            "const re = /datacentre|datacenter/",
            { code: "const a = 'Macquarie Data Centres'", options: [{ allow: ["Macquarie Data Centres"] }] },
            "const a = 'enterprise surprise advertise otherwise'",
        ],
        invalid: [
            { code: "const a = 'the datacentre'", errors: [{ messageId: "british" }] },
            { code: "const a = 'colour and behaviour'", errors: 2 },
            // One pass fixes one word: both fixes target the same comment range, so the
            // second is deferred. `eslint --fix` runs up to 10 passes and lands both.
            { code: "// the licence centre", output: "// the license centre", errors: 2 },
        ],
    });
});

test("require-leading-with-text-size", () => {
    jsx.run("require-leading-with-text-size", requireLeading, {
        valid: [
            '<div className="text-[0.8125rem]/[1.5]" />',
            '<div className="text-[0.8125rem] leading-[1.5]" />',
            '<div className="text-sm" />',
            '<div className="text-[oklch(0.5_0.13_70)]" />',
            'cn("text-[13px]", "leading-relaxed")',
            // Unhinted variables are colors.
            '<div className="text-[var(--chart-2)]" />',
            '<div className="text-(--chart-2)" />',
            '<div className="text-[color:var(--gap-4px)]" />',
            '<div className="text-(length:--size)/[1.4]" />',
        ],
        invalid: [
            { code: '<div className="text-[0.8125rem]" />', errors: [{ messageId: "needsLeading" }] },
            { code: 'cn("px-2 text-[10px] font-medium")', errors: 1 },
            { code: '<div className="text-[clamp(29px,4.2vw,52px)]" />', errors: 1 },
            { code: '<div className="text-[length:var(--size)]" />', errors: 1 },
            { code: '<div className="text-(length:--size)" />', errors: 1 },
        ],
    });
});

test("no-property-shorthand", () => {
    ts.run("no-property-shorthand", noPropertyShorthand, {
        valid: [
            "const o = { a: a }",
            "const o = { f() { return 1 } }",
            "const { a, b } = o",
            "import { x } from 'y'",
            "function f({ a = 1 }) { return a }",
        ],
        invalid: [
            { code: "const o = { a }", output: "const o = { a: a }", errors: [{ messageId: "shorthand" }] },
            { code: "f({ ord, id })", output: "f({ ord: ord, id: id })", errors: 2 },
        ],
    });
});

test("no-module-scope-init: React factories are not config", () => {
    ts.run("no-module-scope-init", noModuleScopeInit, {
        valid: [
            "const Ctx = React.createContext({})",
            "const C = createContext(null)",
            "const toast = ToastPrimitive.createToastManager()",
            // Static args: a shared singleton, not config read at import.
            'const memory = createRouteMemory("/", isOverlayHref)',
        ],
        invalid: [{ code: "const c = createClient(cfg().url)", errors: 1 }],
    });
});

test("no-upward-import", () => {
    // A synthetic workspace, so the test says what the rule does rather than
    // what this repository happens to contain: two ordered tiers, two leaves,
    // and one exempt directory that is outside the layering entirely. It sits
    // under a path that spells a tier and a type dir, and the exempt namespace
    // is itself a type dir, so a verdict read off the checkout path would show.
    const tmp = mkdtempSync(join(tmpdir(), "layering-"));
    const root = join(tmp, "base", "libjs", "w");
    for (const ns of ["base", "mid", "red", "blue", "tools"]) {
        mkdirSync(join(root, ns, "libjs", "ui", "src"), { recursive: true });
    }
    const opts = [{ tiers: ["base", "mid"], exempt: ["tools"], typeDirs: ["libjs", "tools"] }];
    const at = (ns) => ({
        filename: join(root, ns, "libjs", "ui", "src", "x.ts"),
        options: opts,
    });

    ts.run("no-upward-import", noUpwardImport, {
        valid: [
            { code: "import x from 'lodash'", ...at("base") },
            { code: "import x from '@base/ui'", ...at("base") },
            { code: "import x from '@base/ui'", ...at("mid") },
            { code: "import x from '@mid/ui'", ...at("red") },
            { code: "import x from '@base/ui'", ...at("red") },
            // Exempt: outside the layering, so nothing is banned for it, and
            // sharing its name with a type dir changes nothing.
            { code: "import x from '@red/ui'", ...at("tools") },
            // Unconfigured is a no-op, which is the public default.
            { code: "import x from '@red/ui'", filename: join(root, "base", "libjs", "ui", "src", "x.ts") },
        ],
        invalid: [
            { code: "import x from '@mid/ui'", ...at("base"), errors: [{ messageId: "upward" }] },
            { code: "import x from '@red/ui'", ...at("base"), errors: 1 },
            { code: "import x from '@red/ui'", ...at("mid"), errors: 1 },
            { code: "import x from '@blue/ui'", ...at("red"), errors: 1 },
            { code: "export * from '@mid/ui'", ...at("base"), errors: 1 },
        ],
    });

    rmSync(tmp, { recursive: true, force: true });
});

test("us-spelling: fixes comments, never string literals", () => {
    ts.run("us-spelling", usSpelling, {
        valid: [],
        invalid: [
            // A comment is ours to rewrite.
            { code: "// the datacentre", output: "// the datacenter", errors: 1 },
            // A string may be a wire value - reported, never rewritten.
            { code: "const a = 'the datacentre'", output: null, errors: 1 },
            { code: "const o = { k: 'licence' }", output: null, errors: 1 },
        ],
    });
});

test("us-spelling: allow exempts the phrase, not the text holding it", () => {
    const allow = [{ allow: ["Macquarie Data Centres"] }];
    ts.run("us-spelling", usSpelling, {
        valid: [
            { code: "// Macquarie Data Centres, a datacenter", options: allow },
            // Phrases are found before any is blanked, so overlapping ones are both exempt.
            {
                code: "const a = 'Macquarie Data Centres'",
                options: [{ allow: ["Macquarie Data", "Data Centres"] }],
            },
        ],
        invalid: [
            {
                code: "// Macquarie Data Centres, a colour",
                options: allow,
                output: "// Macquarie Data Centres, a color",
                errors: [{ messageId: "british", data: { bad: "colour", good: "color" } }],
            },
            // The fix rewrites the same word outside the phrase and leaves the phrase alone.
            {
                code: "// Macquarie Data Centres runs two Centres",
                options: allow,
                output: "// Macquarie Data Centres runs two Centers",
                errors: 1,
            },
            { code: "const a = 'Macquarie Data Centres, a colour'", options: allow, output: null, errors: 1 },
            // An empty phrase exempts nothing.
            { code: "// a colour", options: [{ allow: [""] }], output: "// a color", errors: 1 },
        ],
    });
    jsx.run("us-spelling", usSpelling, {
        valid: [],
        invalid: [
            {
                code: "<p>Macquarie Data Centres, a colour</p>",
                options: allow,
                output: "<p>Macquarie Data Centres, a color</p>",
                errors: 1,
            },
        ],
    });
});

test("us-spelling: inflected forms", () => {
    ts.run("us-spelling", usSpelling, {
        valid: [
            // The plural of analysis, spelled the same in both.
            "const a = 'two analyses'",
            "const a = 'memoize memoized memoizes memoizing memoization'",
            "const a = 'cataloged enrollment initializer recognizable neighborhood favorable traveling'",
            // Only an -ise verb in the map takes -er and -able; these are US English.
            "const a = 'advertiser advertisers advisable'",
        ],
        invalid: [
            { code: "// memoised", output: "// memoized", errors: 1 },
            { code: "// Normalises", output: "// Normalizes", errors: 1 },
            { code: "// SYNCHRONISATIONS", output: "// SYNCHRONIZATIONS", errors: 1 },
            { code: "const a = 'it recognises'", output: null, errors: 1 },
            { code: "const a = 'favour, favoured, honoured, neighbouring, behavioural'", errors: 5 },
            { code: "// initialiser", output: "// initializer", errors: 1 },
            { code: "// Optimisers", output: "// Optimizers", errors: 1 },
            { code: "// RECOGNISABLE", output: "// RECOGNIZABLE", errors: 1 },
            { code: "// catalogued", output: "// cataloged", errors: 1 },
            { code: "// two storeys", output: "// two stories", errors: 1 },
            { code: "const a = 'already catalogued'", output: null, errors: 1 },
            {
                code: "const a = 'enrolment, signalled, modelled, travelling, neighbourhood, favourable'",
                errors: 6,
            },
        ],
    });
});

test("us-spelling: an -ise verb behind a prefix", () => {
    ts.run("us-spelling", usSpelling, {
        valid: [
            "const a = 'unrecognized deserialize reorganization underutilized'",
            // A prefix and a word that only ends like an -ise verb.
            "const a = 'revise premise disguise unwise'",
            // The prefixes are a closed list, so a snake_case value's tail is not one.
            "const a = 'speed_optimised'",
        ],
        invalid: [
            { code: "// an unrecognised throw", output: "// an unrecognized throw", errors: 1 },
            { code: "const a = 'an unrecognised throw'", output: null, errors: 1 },
            { code: "// Deserialises", output: "// Deserializes", errors: 1 },
            { code: "// UNAUTHORISED", output: "// UNAUTHORIZED", errors: 1 },
            { code: "// unrecognisable", output: "// unrecognizable", errors: 1 },
            { code: "// re-initialise", output: "// re-initialize", errors: 1 },
            {
                code: "const a = 'unauthorised uninitialised reinitialise deserialise disorganised'",
                errors: 5,
            },
            {
                code: "const a = 'unoptimised uncategorised deprioritise desynchronise reorganise'",
                errors: 5,
            },
            { code: "const a = 'preauthorised overoptimised underutilised misrecognised'", errors: 4 },
            { code: "const a = 'reorganisations'", output: null, errors: 1 },
        ],
    });
});

test("prefer-table-facets", () => {
    ts.run("prefer-table-facets", preferTableFacets, {
        valid: [
            "const f = [{ field: \"status\", kind: \"select\" }];",
            "const f = [{ field: \"role\", kind: \"select\", options: roles.map((r) => ({ value: r.key, label: r.name })) }];",
            "const f = [{ field: \"base\", kind: \"select\", options: (all ?? []).map((d) => ({ value: d.base, label: d.name })) }];",
            "const f = [{ field: \"x\", kind: \"text\", options: [\"a\"] }];",
            "const label = Object.fromEntries(Object.entries(OUTCOME).map(([k, o]) => [k, o.label]));",
        ],
        invalid: [
            {
                code: "const f = [{ kind: \"select\", options: [{ value: \"a\", label: \"A\" }] }];",
                errors: [{ messageId: "literal" }],
            },
            {
                code: "const f = [{ kind: \"select\", options: [\"200\", \"302\"].map((v) => ({ value: v, label: v })) }];",
                errors: [{ messageId: "literal" }],
            },
            {
                code: "const f = [{ kind: \"select\", options: Object.entries(S).map(([k, v]) => ({ value: k, label: v.label })) }];",
                options: [{ docsUrl: "https://example.com/facets" }],
                errors: [{ message: /See https:\/\/example\.com\/facets\.$/ }],
            },
        ],
    });
});

test("no-invisible-characters", () => {
    // Built from code points, so this file holds none of the characters it tests.
    const [rlo, pdf, lri, bom] = [0x202e, 0x202c, 0x2066, 0xfeff].map((c) => String.fromCodePoint(c));
    const [zwsp, zwnj, zwj] = [0x200b, 0x200c, 0x200d].map((c) => String.fromCodePoint(c));
    const backslash = String.fromCodePoint(0x5c);
    ts.run("no-invisible-characters", noInvisibleCharacters, {
        valid: [
            "const a = 1;",
            // Text: a joiner in a Persian word or an emoji sequence, a space in a template or a pattern.
            `const fa = "vi${zwnj}pi";`,
            `const emoji = "a${zwj}b";`,
            "const t = `a" + zwsp + "b`;",
            `const r = /a${zwj}b/u;`,
            `// a${zwj}b\nconst c = 1;`,
            `/* a${zwnj}b */ const d = 1;`,
            // The escape spelled out is what the message asks for.
            `const e = "${backslash}u202e";`,
        ],
        invalid: [
            { code: `const s = "a${rlo}b";`, errors: [{ messageId: "invisible" }] },
            { code: `// x${rlo}\nconst a = 1;`, errors: [{ messageId: "invisible" }] },
            { code: "const t = `a" + lri + "b`;", errors: [{ messageId: "invisible" }] },
            { code: `const s = "${rlo}a${pdf}";`, errors: 2 },
            { code: `const s = "a${bom}b";`, errors: [{ messageId: "invisible" }] },
            // In code a joiner is part of a name, so `ab` and this one are two names that look like one.
            { code: `const a${zwj}b = 1;`, errors: [{ message: /^U\+200D \(ZERO WIDTH JOINER\)/ }] },
            {
                code: `const s = "a${rlo}b";`,
                options: [{ docsUrl: "https://example.com/escapes" }],
                errors: [{ message: /See https:\/\/example\.com\/escapes\.$/ }],
            },
        ],
    });
    jsx.run("no-invisible-characters", noInvisibleCharacters, {
        valid: [`const p = <p>a${zwsp}b</p>;`, `const q = <p title="a${zwj}b">x</p>;`],
        invalid: [{ code: `const p = <p>a${rlo}b</p>;`, errors: [{ messageId: "invisible" }] }],
    });
});

test("no-viewport-height", () => {
    jsx.run("no-viewport-height", noViewportHeight, {
        valid: [
            '<div className="min-h-svh h-dvh max-h-[calc(100dvh-2rem)]" />',
            '<div className="h-[min(44rem,85dvh)] max-sm:h-full w-screen" />',
            '<div className="max-h-[min(60svh,32rem,var(--room,100dvh))]" />',
            // Not a vh height: a width, a position, a variable whose name ends in a digit and "vh".
            '<div className="top-[10vh] w-[50vw] h-[var(--nav3vh)]" />',
            'cn("min-h-dvh", "h-full")',
            '<div style={{ height: "100dvh", width: "100vw" }} />',
        ],
        invalid: [
            { code: '<div className="flex min-h-screen" />', errors: [{ messageId: "screen" }] },
            { code: '<div className="sticky top-0 h-screen" />', errors: [{ messageId: "screen" }] },
            { code: '<div className="max-md:max-h-screen" />', errors: [{ messageId: "screen" }] },
            { code: '<div className="relative flex h-[min(44rem,85vh)]" />', errors: [{ messageId: "vh" }] },
            { code: 'cn("max-h-[calc(100vh-2rem)]", x && "h-[100lvh]")', errors: 2 },
            { code: '<div className="[min-height:100vh]" />', errors: [{ messageId: "vh" }] },
            { code: '<div className="!h-screen" />', errors: 1 },
            { code: '<div style={{ minHeight: "100vh" }} />', errors: [{ messageId: "vh" }] },
        ],
    });
});

