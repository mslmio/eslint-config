// A table's picklist filter offers the values its rows actually hold - served by
// the backend as FACETS - rather than a literal list. A literal list is a second
// copy of a vocabulary the backend owns, and the next value it starts writing is
// missing from the picklist until someone remembers to add it.
//
// Reported: `options` on an object with `kind: "select"` that is an array
// literal, a `.map` over one, or a map over Object.entries/keys/values - the
// shapes a hardcoded list takes. Options mapped from runtime data pass. A fixed
// product vocabulary, one no row can grow, stays literal behind a disable
// comment saying so.
export default {
    meta: {
        type: "suggestion",
        docs: {
            description: "A picklist filter lists the values its rows hold (facets), not a literal list",
        },
        schema: [{ type: "object", properties: { docsUrl: { type: "string" } }, additionalProperties: false }],
        messages: {
            literal:
                "A picklist filter should list the values its rows hold: leave `options` off and serve " +
                "them as facets. A fixed product vocabulary stays literal behind a disable comment " +
                "saying why.{{docs}}",
        },
    },
    create(context) {
        const docs = docsSuffix(context);
        return {
            ObjectExpression(node) {
                const kind = property(node, "kind");
                const options = property(node, "options");
                if (!kind || !options || kind.value.type !== "Literal" || kind.value.value !== "select") {
                    return;
                }
                if (isLiteralList(options.value)) {
                    context.report({ node: options, messageId: "literal", data: { docs: docs } });
                }
            },
        };
    },
};

function property(node, name) {
    return node.properties.find((p) => p.type === "Property" && !p.computed
        && ((p.key.type === "Identifier" && p.key.name === name)
            || (p.key.type === "Literal" && p.key.value === name)));
}

function isLiteralList(v) {
    if (v.type === "ArrayExpression") {
        return true;
    }
    if (v.type !== "CallExpression" || v.callee.type !== "MemberExpression" || v.callee.computed
        || v.callee.property.name !== "map") {
        return false;
    }
    const source = v.callee.object;
    if (source.type === "ArrayExpression") {
        return true;
    }
    return source.type === "CallExpression" && source.callee.type === "MemberExpression"
        && source.callee.object.type === "Identifier" && source.callee.object.name === "Object"
        && ["entries", "keys", "values"].includes(source.callee.property.name);
}

// A link only an internal caller can resolve, so the public default is none.
function docsSuffix(context) {
    const url = context.options[0]?.docsUrl;
    return url ? ` See ${url}.` : "";
}
