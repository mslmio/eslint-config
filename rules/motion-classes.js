// What moves on a UI moves on named properties, never starts slow and never grows from nothing: a string's
// Tailwind class `transition-all`, `ease-in`, `scale-0`, `zoom-in-0` or `zoom-out-0`, under any variant, and an
// inline `transition: all` or `ease-in` easing, are reported. Text a person reads (JSX text) is not checked.
const CLASSES = {
    "transition-all": "animates whatever else changes, layout included: name the properties "
        + "(transition-colors, transition-opacity, transition-transform, transition-[color,box-shadow])",
    "ease-in": "starts slow, at the moment the user is watching: ease-out entering or leaving, ease-in-out "
        + "for movement on screen",
    "scale-0": "grows from nothing: start at 95% (zoom-in-95, scale-95) with the opacity at 0",
    "zoom-in-0": "grows from nothing: start at 95% (zoom-in-95) with the opacity at 0",
    "zoom-out-0": "shrinks to nothing: end at 95% (zoom-out-95) with the opacity at 0",
};
const INLINE = [
    [/\btransition(?:-property)?\s*:\s*all\b/, "transition-all"],
    [/\bease-in\b(?!-)/, "ease-in"],
];

export default {
    meta: {
        type: "problem",
        docs: { description: "Motion names its properties, never starts slow, never grows from nothing" },
        schema: [{ type: "object", properties: { docsUrl: { type: "string" } }, additionalProperties: false }],
        messages: {
            motion: "`{{found}}` {{why}}.{{docs}}",
        },
    },
    create(context) {
        const docs = docsSuffix(context);
        const report = (node, found, base) => {
            context.report({
                node: node,
                messageId: "motion",
                data: { found: found, why: CLASSES[base], docs: docs },
            });
        };
        const check = (node, text) => {
            if (typeof text !== "string" || text === "") {
                return;
            }
            for (const token of text.split(/\s+/)) {
                const base = token.slice(token.lastIndexOf(":") + 1).replace(/^!/, "");
                if (Object.hasOwn(CLASSES, base)) {
                    report(node, token, base);
                    return;
                }
            }
            for (const [pattern, base] of INLINE) {
                const m = pattern.exec(text);
                if (m) {
                    report(node, m[0], base);
                    return;
                }
            }
        };
        return {
            Literal(node) {
                check(node, node.value);
            },
            TemplateElement(node) {
                check(node, node.value.cooked);
            },
            Property(node) {
                const key = node.key?.name ?? node.key?.value;
                const value = node.value?.type === "Literal" ? node.value.value : null;
                if ((key === "transition" || key === "transitionProperty") && /^all\b/.test(value ?? "")) {
                    report(node.value, `${key}: ${value}`, "transition-all");
                }
            },
        };
    },
};

function docsSuffix(context) {
    const url = context.options[0]?.docsUrl;
    return url ? ` See ${url}.` : "";
}
