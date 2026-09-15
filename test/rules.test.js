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
        ],
        invalid: [
            { code: "const u = process.env.URL", errors: [{ messageId: "libReadsEnv" }] },
            { code: "export const f = () => process.env.A ?? 'b'", errors: 1 },
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
        ],
        invalid: [
            { code: '<div className="text-[0.8125rem]" />', errors: [{ messageId: "needsLeading" }] },
            { code: 'cn("px-2 text-[10px] font-medium")', errors: 1 },
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
