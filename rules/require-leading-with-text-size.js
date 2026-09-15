const CLASS_FNS = new Set(["cn", "clsx", "cva", "classNames", "twMerge", "twJoin"]);
const COLOR_RE = /^(#|rgba?\(|hsla?\(|oklch\(|oklab\(|lab\(|lch\(|color-mix\(|currentColor|transparent)/i;
const LENGTH_RE = /(^|[\d.])(rem|px|em|ex|ch|vw|vh|vmin|vmax|pt|pc|%)\b|^(calc|clamp|min|max|var)\(|^[\d.]+$/;
const TEXT_ARB_RE = /\btext-\[([^\]]+)\](\/\S+)?/g;

export default {
    meta: {
        type: "problem",
        docs: {
            description:
                "An arbitrary text size must state its own line height - it inherits one otherwise, and the ancestor differs per host",
        },
        schema: [{ type: "object", properties: { docsUrl: { type: "string" } }, additionalProperties: false }],
        messages: {
            needsLeading:
                "`text-[{{value}}]` sets a font SIZE only, so line height comes from whatever ancestor " +
                "set one - which differs between hosts and renders the same row at two heights. State it: " +
                "`text-[{{value}}]/[<leading>]` or an explicit `leading-*`.{{docs}}",
        },
    },
    create(context) {
        const docs = docsSuffix(context);
        const seen = new WeakSet();

        const checkContainer = (node, parts) => {
            const combined = parts.join(" ");
            if (/\bleading-/.test(combined)) {
                return;
            }
            for (const part of parts) {
                for (const m of part.matchAll(TEXT_ARB_RE)) {
                    if (m[2] || !isLength(m[1])) {
                        continue;
                    }
                    context.report({ node: node, messageId: "needsLeading", data: { value: m[1], docs: docs } });
                }
            }
        };

        return {
            JSXAttribute(node) {
                if (node.name?.name !== "className" && node.name?.name !== "class") {
                    return;
                }
                seen.add(node);
                checkContainer(node, collectStrings(node.value, seen));
            },
            CallExpression(node) {
                if (!CLASS_FNS.has(calleeName(node.callee)) || seen.has(node)) {
                    return;
                }
                seen.add(node);
                checkContainer(node, node.arguments.flatMap((a) => collectStrings(a, seen)));
            },
        };
    },
};

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

function isLength(value) {
    const v = value.trim();
    if (COLOR_RE.test(v)) {
        return false;
    }
    return LENGTH_RE.test(v);
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
