import expoConfig from "eslint-config-expo/flat.js";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default [
  ...expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "ios/*", "android/*"],
  },
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      "no-irregular-whitespace": [
        "error",
        { skipRegExps: true, skipStrings: false },
      ],
      "react/self-closing-comp": "error",
      "react/display-name": "off",
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            /**
             * Node built-ins
             */
            [
              "^(assert|buffer|child_process|cluster|console|constants|crypto|dgram|dns|domain|events|fs|http|https|module|net|os|path|punycode|querystring|readline|repl|stream|string_decoder|sys|timers|tls|tty|url|util|vm|zlib|worker_threads|perf_hooks)(/.*|$)",
            ],
            /**
             * React/React Native first, then all other external packages
             * (workspace `@factfeed/*` packages get their own group below)
             */
            ["^(react|react-native)(/.*)?$", "^@(?!factfeed/)\\w", "^[^@.]"],
            /**
             * Workspace packages (`@factfeed/contract`, `@factfeed/api`, …)
             */
            ["^@factfeed/"],
            /**
             * Internal: foundational layers (types → constants → clients →
             * utils → hooks → providers → content)
             */
            [
              "^@/types",
              "^@/constants",
              "^@/clients",
              "^@/utils",
              "^@/hooks",
              "^@/providers",
              "^@/content",
            ],
            /**
             * Internal: UI layer (components)
             */
            ["^@/components"],
            /**
             * Internal: screens (route-bound containers, sit above components)
             */
            ["^@/screens"],
            /**
             * Internal: any remaining @/ paths
             */
            ["^@/"],
            /**
             * Side-effect imports
             */
            ["^\\u0000"],
            /**
             * Relative parent imports
             */
            ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
            /**
             * Relative sibling imports + CSS
             */
            ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$", "^.+\\.s?css$"],
          ],
        },
      ],
    },
  },
];
