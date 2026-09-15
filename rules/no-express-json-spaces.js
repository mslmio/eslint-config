export default {
    meta: {
        type: "problem",
        docs: {
            description:
                "Use the prettyJson middleware, not express's `json spaces`, which omits the trailing newline",
        },
        schema: [],
        messages: {
            jsonSpaces:
                "`app.set('json spaces', ...)` indents but omits the trailing newline that keeps a shell " +
                "prompt off the closing brace. Use a pretty-print middleware that emits one.",
        },
    },
    create(context) {
        return {
            CallExpression(node) {
                if (node.callee?.type !== "MemberExpression") {
                    return;
                }
                if (node.callee.property?.name !== "set" || node.arguments.length !== 2) {
                    return;
                }
                const [key] = node.arguments;
                if (key?.type !== "Literal" || key.value !== "json spaces") {
                    return;
                }
                context.report({ node: node, messageId: "jsonSpaces" });
            },
        };
    },
};
