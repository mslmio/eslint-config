const DEFAULT_ENTRY_POINTS = ["main.ts", "main.js", "main.mts", "main.mjs"];

export default {
    meta: {
        type: "problem",
        docs: {
            description:
                "A published library never reads process.env; configuration is passed in as a typed argument",
        },
        schema: [
            {
                type: "object",
                properties: {
                    entryPoints: { type: "array", items: { type: "string" } },
                    docsUrl: { type: "string" },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            libReadsEnv:
                "A library must not read process.env - take this as a typed argument instead. " +
                "An env-reading library cannot be configured twice in one process or differently in a " +
                "test, and a missing value fails at request time under a name the service author never " +
                "saw.{{docs}}",
        },
    },
    create(context) {
        const docs = docsSuffix(context);
        const entryPoints = context.options[0]?.entryPoints ?? DEFAULT_ENTRY_POINTS;
        const filename = context.filename ?? context.getFilename();
        if (entryPoints.some((e) => filename.endsWith(e))) {
            return {};
        }
        return {
            MemberExpression(node) {
                if (!isProcessEnv(node)) {
                    return;
                }
                context.report({ node: node, messageId: "libReadsEnv", data: { docs: docs } });
            },
        };
    },
};

function isProcessEnv(node) {
    return (
        node.object?.type === "Identifier" &&
        node.object.name === "process" &&
        node.property?.type === "Identifier" &&
        node.property.name === "env"
    );
}

// A link only an internal caller can resolve, so the public default is none.
function docsSuffix(context) {
    const url = context.options[0]?.docsUrl;
    return url ? ` See ${url}.` : "";
}
