// Characters that print as nothing, so source reads differently from how it runs.
//
// The explicit bidi controls reorder what a reader sees (Trojan Source, CVE-2021-42574),
// inside a string or a comment as much as in code, so they are refused everywhere; so is a
// U+FEFF past the start of a file. The zero-width space, joiners and marks are text: a joiner
// sits in a Persian word or an emoji sequence, a mark in Arabic. In code they are the same
// name spelled two ways, so only there are they refused.
const ANYWHERE = new Map([
    [0x202a, "LEFT-TO-RIGHT EMBEDDING"],
    [0x202b, "RIGHT-TO-LEFT EMBEDDING"],
    [0x202c, "POP DIRECTIONAL FORMATTING"],
    [0x202d, "LEFT-TO-RIGHT OVERRIDE"],
    [0x202e, "RIGHT-TO-LEFT OVERRIDE"],
    [0x2066, "LEFT-TO-RIGHT ISOLATE"],
    [0x2067, "RIGHT-TO-LEFT ISOLATE"],
    [0x2068, "FIRST STRONG ISOLATE"],
    [0x2069, "POP DIRECTIONAL ISOLATE"],
    [0xfeff, "ZERO WIDTH NO-BREAK SPACE"],
]);

const IN_CODE = new Map([
    [0x200b, "ZERO WIDTH SPACE"],
    [0x200c, "ZERO WIDTH NON-JOINER"],
    [0x200d, "ZERO WIDTH JOINER"],
    [0x200e, "LEFT-TO-RIGHT MARK"],
    [0x200f, "RIGHT-TO-LEFT MARK"],
]);

const PATTERN = /[\u{200B}-\u{200F}\u{202A}-\u{202E}\u{2066}-\u{2069}\u{FEFF}]/gu;

// What a reader takes as text rather than code: where a joiner or a mark belongs.
const TEXT_TOKENS = new Set(["String", "Template", "RegularExpression", "JSXText"]);

export default {
    meta: {
        type: "problem",
        docs: {
            description: "No invisible bidi or zero-width characters, which make source read differently from how it runs",
        },
        schema: [
            {
                type: "object",
                properties: { docsUrl: { type: "string" } },
                additionalProperties: false,
            },
        ],
        messages: {
            invisible:
                "{{codePoint}} ({{name}}) prints as nothing, so this line reads differently from how it " +
                "runs. Write it as an escape in a string, or remove it.{{docs}}",
        },
    },
    create(context) {
        const docs = docsSuffix(context);
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        return {
            Program() {
                let text = null;
                for (const m of sourceCode.text.matchAll(PATTERN)) {
                    const codePoint = m[0].codePointAt(0);
                    let name = ANYWHERE.get(codePoint);
                    if (name === undefined) {
                        text ??= textRanges(sourceCode);
                        if (text.some(([start, end]) => m.index >= start && m.index < end)) {
                            continue;
                        }
                        name = IN_CODE.get(codePoint);
                    }
                    context.report({
                        loc: {
                            start: sourceCode.getLocFromIndex(m.index),
                            end: sourceCode.getLocFromIndex(m.index + m[0].length),
                        },
                        messageId: "invisible",
                        data: {
                            codePoint: `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`,
                            name: name,
                            docs: docs,
                        },
                    });
                }
            },
        };
    },
};

function textRanges(sourceCode) {
    const tokens = (sourceCode.ast.tokens ?? []).filter((t) => TEXT_TOKENS.has(t.type));
    return [...tokens, ...sourceCode.getAllComments()].map((t) => t.range);
}

function docsSuffix(context) {
    const url = context.options[0]?.docsUrl;
    return url ? ` See ${url}.` : "";
}
