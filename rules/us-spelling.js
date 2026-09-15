const COMPOUND_STEMS = { centre: "center", centres: "centers", centred: "centered" };

const WORDS = {
    metre: "meter", metres: "meters", litre: "liter", litres: "liters",
    fibre: "fiber", fibres: "fibers", theatre: "theater", calibre: "caliber",
    sombre: "somber", spectre: "specter", lustre: "luster", manoeuvre: "maneuver",
    colour: "color", colours: "colors", coloured: "colored", colourful: "colorful",
    behaviour: "behavior", behaviours: "behaviors", favourite: "favorite",
    favourites: "favorites", honour: "honor", neighbour: "neighbor",
    neighbours: "neighbors", labour: "labor", flavour: "flavor", flavours: "flavors",
    harbour: "harbor", rumour: "rumor", humour: "humor", odour: "odor",
    vapour: "vapor", armour: "armor", endeavour: "endeavor", parlour: "parlor",
    savour: "savor", valour: "valor",
    grey: "gray", greyed: "grayed", licence: "license", licences: "licenses",
    defence: "defense", offence: "offense", pretence: "pretense", practise: "practice",
    analyse: "analyze", analysed: "analyzed", analysing: "analyzing",
    paralyse: "paralyze", catalogue: "catalog", catalogues: "catalogs",
    programme: "program", programmes: "programs", aluminium: "aluminum",
    storey: "story", tyre: "tire", sulphur: "sulfur", plough: "plow",
    mould: "mold", draught: "draft", enquire: "inquire", enquiry: "inquiry",
    cancelled: "canceled", cancelling: "canceling", travelled: "traveled",
    modelling: "modeling", labelled: "labeled", labelling: "labeling",
    fuelled: "fueled", signalling: "signaling", marvellous: "marvelous",
    skilful: "skillful", enrol: "enroll", fulfil: "fulfill", instalment: "installment",
    organise: "organize", organised: "organized", organisation: "organization",
    organisations: "organizations", recognise: "recognize", recognised: "recognized",
    realise: "realize", realised: "realized", apologise: "apologize",
    prioritise: "prioritize", prioritised: "prioritized", customise: "customize",
    customised: "customized", normalise: "normalize", normalised: "normalized",
    serialise: "serialize", serialised: "serialized", initialise: "initialize",
    initialised: "initialized", optimise: "optimize", optimised: "optimized",
    summarise: "summarize", categorise: "categorize", categorised: "categorized",
    standardise: "standardize", specialise: "specialize", emphasise: "emphasize",
    criticise: "criticize", authorise: "authorize", authorised: "authorized",
    minimise: "minimize", maximise: "maximize", visualise: "visualize",
    utilise: "utilize", memorise: "memorize", synchronise: "synchronize",
    synchronised: "synchronized",
};

const WORD_RE = new RegExp(`\\b(${Object.keys(WORDS).join("|")})\\b`, "gi");
const COMPOUND_RE = new RegExp(`\\b(\\w*?)(${Object.keys(COMPOUND_STEMS).join("|")})\\b`, "gi");

export default {
    meta: {
        type: "suggestion",
        docs: { description: "US spelling everywhere we write" },
        // Fixable in COMMENTS and JSX TEXT only. A string literal can be a wire value -
        // an upstream status, a served route, a search synonym - and rewriting one is how
        // a filter silently stops matching. Those are reported for a human to judge.
        fixable: "code",
        schema: [
            {
                type: "object",
                properties: { allow: { type: "array", items: { type: "string" } } },
                additionalProperties: false,
            },
        ],
        messages: { british: "Use US spelling: `{{bad}}` -> `{{good}}`." },
    },
    create(context) {
        const allow = context.options[0]?.allow ?? [];
        const sourceCode = context.sourceCode ?? context.getSourceCode();

        const check = (node, text, fixable) => {
            if (typeof text !== "string" || !text) {
                return;
            }
            if (allow.some((phrase) => text.includes(phrase))) {
                return;
            }
            for (const [bad, good] of findAll(text)) {
                context.report({
                    node: node,
                    messageId: "british",
                    data: { bad: bad, good: good },
                    fix: fixable
                        ? (fixer) => {
                              const range = node.range ?? [node.start, node.end];
                              const src = sourceCode.getText().slice(range[0], range[1]);
                              return fixer.replaceTextRange(range, replaceWord(src, bad, good));
                          }
                        : null,
                });
            }
        };

        return {
            // A regex matching scraped text must accept BOTH spellings, so literals carrying one are exempt.
            Literal(node) {
                if (node.regex) {
                    return;
                }
                check(node, node.value, false);
            },
            TemplateElement(node) {
                check(node, node.value?.raw, false);
            },
            JSXText(node) {
                check(node, node.value, true);
            },
            "Program:exit": () => {
                for (const comment of sourceCode.getAllComments()) {
                    check(comment, comment.value, true);
                }
            },
        };
    },
};

function replaceWord(src, bad, good) {
    return src.replace(new RegExp(`\\b${bad}\\b`, "g"), good);
}

function findAll(text) {
    const hits = [];
    for (const m of text.matchAll(WORD_RE)) {
        hits.push([m[1], matchCase(m[1], WORDS[m[1].toLowerCase()])]);
    }
    for (const m of text.matchAll(COMPOUND_RE)) {
        const stem = COMPOUND_STEMS[m[2].toLowerCase()];
        hits.push([m[0], m[1] + matchCase(m[2], stem)]);
    }
    return hits;
}

function matchCase(sample, replacement) {
    if (sample === sample.toUpperCase()) {
        return replacement.toUpperCase();
    }
    if (sample[0] === sample[0].toUpperCase()) {
        return replacement[0].toUpperCase() + replacement.slice(1);
    }
    return replacement;
}
