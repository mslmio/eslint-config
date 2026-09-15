const FACTORY_RE = /^(create|connect|init|make|load|open|build)[A-Z]/;
const CONFIG_CALLEES = new Set(["cfg", "config", "env", "getConfig", "getEnv"]);
// Factories that MUST run at module scope. A React context is a shared token, not a
// client: building it lazily would hand each caller a different context object, so the
// provider would set one instance and the consumer read another.
const SAFE_CALLEES = new Set([
    "createContext",
    "createServerContext",
    "createElement",
    "createRef",
    "createPortal",
    "createToastManager",
    "createRoot",
    "createSelector",
    "createGlobalStyle",
]);

export default {
    meta: {
        type: "problem",
        docs: {
            description:
                "No client or config construction at module scope - it runs at import, before any caller can configure it",
        },
        schema: [
            {
                type: "object",
                properties: {
                    extraCallees: { type: "array", items: { type: "string" } },
                    docsUrl: { type: "string" },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            moduleScopeInit:
                "`{{name}}` is constructed at module scope, so it runs on import - before any caller " +
                "can configure it, and in every process that merely imports this file. Build it lazily " +
                "inside a function and memoise.{{docs}}",
        },
    },
    create(context) {
        const extra = new Set(context.options[0]?.extraCallees ?? []);
        const docs = docsSuffix(context);
        return {
            "Program > VariableDeclaration > VariableDeclarator": (node) => check(context, extra, node, docs),
            "Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator": (node) =>
                check(context, extra, node, docs),
        };
    },
};

function check(context, extra, node, docs) {
    if (!node.init || node.id?.type !== "Identifier") {
        return;
    }
    // A factory with STATIC arguments is a shared singleton, not config: `createRouteMemory("/",
    // isOverlayHref)` computes nothing at import. What this rule is for is the config being READ
    // at import - `createClient(cfg().url)` - so require an argument that computes, or an env read.
    if (!readsEnv(node.init) && !(callsFactory(node.init, extra) && hasComputedArg(node.init))) {
        return;
    }
    context.report({ node: node, messageId: "moduleScopeInit", data: { name: node.id.name, docs: docs } });
}

function callsFactory(node, extra) {
    if (node.type !== "CallExpression") {
        return false;
    }
    const name = calleeName(node.callee);
    if (!name || SAFE_CALLEES.has(name)) {
        return false;
    }
    return FACTORY_RE.test(name) || CONFIG_CALLEES.has(name) || extra.has(name);
}

function hasComputedArg(node) {
    return (node.arguments ?? []).some((arg) => {
        let found = false;
        walk(arg, (n) => {
            if (n.type === "CallExpression" || n.type === "NewExpression") {
                found = true;
            }
        });
        return found;
    });
}

function calleeName(callee) {
    if (callee?.type === "Identifier") {
        return callee.name;
    }
    if (callee?.type === "MemberExpression" && callee.property?.type === "Identifier") {
        return callee.property.name;
    }
    if (callee?.type === "NewExpression") {
        return calleeName(callee.callee);
    }
    return null;
}

function readsEnv(node) {
    let found = false;
    walk(node, (n) => {
        if (
            n.type === "MemberExpression" &&
            n.object?.type === "Identifier" &&
            n.object.name === "process" &&
            n.property?.type === "Identifier" &&
            n.property.name === "env"
        ) {
            found = true;
        }
    });
    return found;
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
