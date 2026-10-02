const COMPOUND_STEMS = { centre: "center", centres: "centers", centred: "centered" };

// Each -ise verb in every form: -ise, -ised, -ises, -ising, -isation(s), -iser(s) and -isable.
const ISE_VERBS = {
    apologise: "apologize", authorise: "authorize", categorise: "categorize", criticise: "criticize",
    customise: "customize", emphasise: "emphasize", initialise: "initialize", maximise: "maximize",
    memoise: "memoize", memorise: "memorize", minimise: "minimize", normalise: "normalize",
    optimise: "optimize", organise: "organize", prioritise: "prioritize", realise: "realize",
    recognise: "recognize", serialise: "serialize", specialise: "specialize",
    standardise: "standardize", summarise: "summarize", synchronise: "synchronize",
    utilise: "utilize", visualise: "visualize",
};
const ISE_ENDINGS = ["e", "ed", "es", "ing", "ation", "ations", "er", "ers", "able"];

const WORDS = {
    metre: "meter", metres: "meters", litre: "liter", litres: "liters", fibre: "fiber", fibres: "fibers",
    theatre: "theater", theatres: "theaters", calibre: "caliber", calibres: "calibers", sombre: "somber",
    spectre: "specter", spectres: "specters", lustre: "luster",
    manoeuvre: "maneuver", manoeuvres: "maneuvers", manoeuvred: "maneuvered", manoeuvring: "maneuvering",
    manoeuvrable: "maneuverable",
    colour: "color", colours: "colors", coloured: "colored", colouring: "coloring", colourful: "colorful",
    colourfully: "colorfully", colourless: "colorless",
    behaviour: "behavior", behaviours: "behaviors", behavioural: "behavioral", behaviourally: "behaviorally",
    favour: "favor", favours: "favors", favoured: "favored", favouring: "favoring", favourable: "favorable",
    favourably: "favorably", unfavourable: "unfavorable", unfavourably: "unfavorably",
    favourite: "favorite", favourites: "favorites", favouritism: "favoritism",
    honour: "honor", honours: "honors", honoured: "honored", honouring: "honoring", honourable: "honorable",
    honourably: "honorably",
    neighbour: "neighbor", neighbours: "neighbors", neighbouring: "neighboring",
    neighbourhood: "neighborhood", neighbourhoods: "neighborhoods", neighbourly: "neighborly",
    labour: "labor", labours: "labors", laboured: "labored", labouring: "laboring", labourer: "laborer",
    labourers: "laborers",
    flavour: "flavor", flavours: "flavors", flavoured: "flavored", flavouring: "flavoring",
    flavourful: "flavorful", flavourless: "flavorless",
    harbour: "harbor", harbours: "harbors", harboured: "harbored", harbouring: "harboring",
    rumour: "rumor", rumours: "rumors", rumoured: "rumored",
    humour: "humor", humours: "humors", humoured: "humored", humourless: "humorless",
    odour: "odor", odours: "odors", odourless: "odorless", vapour: "vapor", vapours: "vapors",
    armour: "armor", armoured: "armored", armoury: "armory", armouries: "armories",
    endeavour: "endeavor", endeavours: "endeavors", endeavoured: "endeavored", endeavouring: "endeavoring",
    parlour: "parlor", parlours: "parlors", valour: "valor",
    savour: "savor", savours: "savors", savoured: "savored", savouring: "savoring", savoury: "savory",
    grey: "gray", greys: "grays", greyed: "grayed", greying: "graying", greyish: "grayish",
    licence: "license", licences: "licenses", defence: "defense", defences: "defenses",
    offence: "offense", offences: "offenses", pretence: "pretense", pretences: "pretenses",
    practise: "practice", practises: "practices", practised: "practiced", practising: "practicing",
    analyse: "analyze", analysed: "analyzed", analysing: "analyzing", analyser: "analyzer",
    analysers: "analyzers",
    paralyse: "paralyze", paralysed: "paralyzed", paralysing: "paralyzing",
    catalogue: "catalog", catalogues: "catalogs", catalogued: "cataloged", cataloguing: "cataloging",
    programme: "program", programmes: "programs", aluminium: "aluminum", sulphur: "sulfur",
    storey: "story", storeys: "stories", tyre: "tire", tyres: "tires",
    plough: "plow", ploughs: "plows", ploughed: "plowed", ploughing: "plowing",
    mould: "mold", moulds: "molds", moulded: "molded", moulding: "molding", mouldy: "moldy",
    draught: "draft", draughts: "drafts",
    enquire: "inquire", enquires: "inquires", enquired: "inquired", enquiring: "inquiring",
    enquiry: "inquiry", enquiries: "inquiries",
    cancelled: "canceled", cancelling: "canceling",
    travelled: "traveled", travelling: "traveling", traveller: "traveler", travellers: "travelers",
    modelled: "modeled", modelling: "modeling", modeller: "modeler", modellers: "modelers",
    labelled: "labeled", labelling: "labeling", fuelled: "fueled", fuelling: "fueling",
    signalled: "signaled", signalling: "signaling", marvellous: "marvelous", marvellously: "marvelously",
    skilful: "skillful", skilfully: "skillfully",
    enrol: "enroll", enrols: "enrolls", enrolment: "enrollment", enrolments: "enrollments",
    fulfil: "fulfill", fulfils: "fulfills", fulfilment: "fulfillment",
    instalment: "installment", instalments: "installments",
    ...Object.fromEntries(
        Object.entries(ISE_VERBS).flatMap(([gb, us]) =>
            ISE_ENDINGS.map((ending) => [gb.slice(0, -1) + ending, us.slice(0, -1) + ending]),
        ),
    ),
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
