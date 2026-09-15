const BANNED = new Map([["Clipboard", "Copy"], ["ClipboardCopy", "Copy"]]);

export default {
    meta: {
        type: "suggestion",
        docs: { description: "Copy buttons use lucide's Copy icon, not Clipboard" },
        schema: [],
        fixable: "code",
        messages: {
            useCopy: "Use lucide's `{{good}}` icon rather than `{{bad}}` for copy affordances.",
        },
    },
    create(context) {
        return {
            ImportDeclaration(node) {
                if (node.source.value !== "lucide-react") {
                    return;
                }
                for (const spec of node.specifiers) {
                    if (spec.type !== "ImportSpecifier") {
                        continue;
                    }
                    const good = BANNED.get(spec.imported.name);
                    if (!good) {
                        continue;
                    }
                    context.report({
                        node: spec,
                        messageId: "useCopy",
                        data: { bad: spec.imported.name, good: good },
                        fix: (fixer) => {
                            if (spec.local.name !== spec.imported.name) {
                                return null;
                            }
                            return fixer.replaceText(spec, good);
                        },
                    });
                }
            },
        };
    },
};
