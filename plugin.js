import noLibProcessEnv from "./rules/no-lib-process-env.js";
import noModuleScopeInit from "./rules/no-module-scope-init.js";
import noExpressJsonSpaces from "./rules/no-express-json-spaces.js";
import preferCopyIcon from "./rules/prefer-copy-icon.js";
import usSpelling from "./rules/us-spelling.js";
import requireLeadingWithTextSize from "./rules/require-leading-with-text-size.js";
import noPropertyShorthand from "./rules/no-property-shorthand.js";
import noUpwardImport from "./rules/no-upward-import.js";

export default {
    meta: { name: "@mslmio/eslint-plugin", version: "2.4.0" },
    rules: {
        "no-lib-process-env": noLibProcessEnv,
        "no-module-scope-init": noModuleScopeInit,
        "no-express-json-spaces": noExpressJsonSpaces,
        "prefer-copy-icon": preferCopyIcon,
        "us-spelling": usSpelling,
        "require-leading-with-text-size": requireLeadingWithTextSize,
        "no-property-shorthand": noPropertyShorthand,
        "no-upward-import": noUpwardImport,
    },
};
