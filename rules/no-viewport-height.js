// A height sized by `vh`, `lvh` or a `*-screen` utility is the viewport with the browser's toolbars HIDDEN, so
// on a phone whose toolbar sits at the bottom (Android Chrome's, and its tab strip) the toolbar covers the
// foot of whatever it sizes. `svh`, the viewport with the toolbars shown, floors a page; `dvh`, as they stand,
// sizes a full-height surface or caps a box; and a fixed box's own edges (`inset-0`) read no unit at all.
const CLASS_FNS = new Set(["cn", "clsx", "cva", "classNames", "twMerge", "twJoin"]);
const SCREEN_RE = /^(min-|max-)?h-screen$/;
// A height utility's arbitrary value, or an arbitrary height property: `h-[85vh]`, `max-h-[calc(100vh-2rem)]`,
// `[min-height:100lvh]`.
const HEIGHT_ARB_RE = /^(?:(?:min-|max-)?h|size)-\[(.+)\]$|^\[(?:min-height|max-height|height):(.+)\]$/;
// A `vh` or `lvh` length, never `dvh` or `svh`, nor the end of a word such as an id.
const VH_RE = /(?:^|[^a-z0-9.])(?:\d+\.?\d*|\.\d+)l?vh(?![a-z0-9])/i;
const STYLE_HEIGHTS = new Set(["height", "minHeight", "maxHeight"]);

export default {
    meta: {
        type: "problem",
        docs: {
            description:
                "A height is never sized by the viewport with the browser's toolbars hidden (vh, lvh, *-screen)",
        },
        schema: [{ type: "object", properties: { docsUrl: { type: "string" } }, additionalProperties: false }],
        messages: {
            screen:
                "`{{value}}` is the viewport's height with the browser's toolbars hidden, so a bottom toolbar or " +
                "tab strip covers its foot. Floor a page with `min-h-svh`, size a full-height surface with " +
                "`h-dvh`, or give a fixed box its own edges (`inset-0`).{{docs}}",
            vh:
                "`{{value}}` measures a height in `vh`, the viewport with the browser's toolbars hidden, so a " +
                "bottom toolbar or tab strip covers its foot. Use `dvh` (as the toolbars stand) or `svh` (with " +
                "them shown).{{docs}}",
        },
    },
    create(context) {
        const docs = docsSuffix(context);
        const seen = new WeakSet();

        const checkStrings = (node, parts) => {
            for (const part of parts) {
                for (const token of part.split(/\s+/)) {
                    const problem = problemOf(token);
                    if (problem) {
                        context.report({ node: node, messageId: problem, data: { value: token, docs: docs } });
                    }
                }
            }
        };

        return {
            JSXAttribute(node) {
                const name = node.name?.name;
                if (name === "style") {
                    checkStyle(context, node.value, docs);
                    return;
                }
                if (name !== "className" && name !== "class") {
                    return;
                }
                seen.add(node);
                checkStrings(node, collectStrings(node.value, seen));
            },
            CallExpression(node) {
                if (!CLASS_FNS.has(calleeName(node.callee)) || seen.has(node)) {
                    return;
                }
                seen.add(node);
                checkStrings(node, node.arguments.flatMap((a) => collectStrings(a, seen)));
            },
        };
    },
};

// What is wrong with one class token, once its variants (`max-md:`, `data-[x]:`) and an important mark are
// stripped, or null.
function problemOf(token) {
    const utility = utilityOf(token).replace(/^!|!$/g, "");
    if (SCREEN_RE.test(utility)) {
        return "screen";
    }
    const m = HEIGHT_ARB_RE.exec(utility);
    return m && VH_RE.test(m[1] ?? m[2]) ? "vh" : null;
}

// A token's utility: what follows its last variant colon outside brackets.
function utilityOf(token) {
    let depth = 0;
    let start = 0;
    for (let i = 0; i < token.length; i++) {
        const c = token[i];
        if (c === "[" || c === "(") {
            depth++;
        } else if (c === "]" || c === ")") {
            depth--;
        } else if (c === ":" && depth === 0) {
            start = i + 1;
        }
    }
    return token.slice(start);
}

// `style={{ height: "100vh" }}`, and its min and max.
function checkStyle(context, value, docs) {
    const obj = value?.type === "JSXExpressionContainer" ? value.expression : null;
    if (obj?.type !== "ObjectExpression") {
        return;
    }
    for (const p of obj.properties) {
        const key = p.key?.type === "Identifier" ? p.key.name : p.key?.value;
        if (p.type !== "Property" || !STYLE_HEIGHTS.has(key)) {
            continue;
        }
        for (const s of collectStrings(p.value, new WeakSet())) {
            if (VH_RE.test(s)) {
                context.report({ node: p, messageId: "vh", data: { value: `${key}: ${s}`, docs: docs } });
            }
        }
    }
}

function collectStrings(node, seen) {
    const out = [];
    walk(node, (n) => {
        if (n !== node && (n.type === "CallExpression" || n.type === "JSXAttribute")) {
            seen.add(n);
        }
        if (n.type === "Literal" && typeof n.value === "string") {
            out.push(n.value);
        }
        if (n.type === "TemplateElement") {
            out.push(n.value?.raw ?? "");
        }
    });
    return out;
}

function calleeName(callee) {
    if (callee?.type === "Identifier") {
        return callee.name;
    }
    if (callee?.type === "MemberExpression" && callee.property?.type === "Identifier") {
        return callee.property.name;
    }
    return null;
}

function walk(node, visit) {
    if (!node || typeof node.type !== "string") {
        return;
    }
    visit(node);
    for (const key of Object.keys(node)) {
        if (key === "parent") {
            continue;
        }
        const child = node[key];
        if (Array.isArray(child)) {
            child.forEach((c) => walk(c, visit));
        } else if (child && typeof child.type === "string") {
            walk(child, visit);
        }
    }
}

// A link only an internal caller can resolve, so the public default is none.
function docsSuffix(context) {
    const url = context.options[0]?.docsUrl;
    return url ? ` See ${url}.` : "";
}
