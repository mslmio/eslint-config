export default {
    meta: {
        type: "suggestion",
        docs: { description: "Object literals spell out the value: `{ key: key }`, never `{ key }`" },
        schema: [],
        fixable: "code",
        messages: { shorthand: "Write `{{name}}: {{name}}` rather than the shorthand `{{name}}`." },
    },
    create(context) {
        return {
            // Only object literal CREATION: code-ts.md exempts destructuring and imports, which
            // also parse as shorthand Property nodes but under an ObjectPattern. `method` is
            // excluded because the doc bans shorthand PROPERTIES, not `f() {}`.
            Property(node) {
                if (!node.shorthand || node.method || node.parent?.type !== "ObjectExpression") {
                    return;
                }
                const name = node.key?.name;
                if (!name) {
                    return;
                }
                context.report({
                    node: node,
                    messageId: "shorthand",
                    data: { name: name },
                    fix: (fixer) => fixer.replaceText(node, `${name}: ${name}`),
                });
            },
        };
    },
};
