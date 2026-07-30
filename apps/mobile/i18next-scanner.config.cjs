const typescriptTransform = require("i18next-scanner-typescript");

module.exports = {
  input: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}", "!src/**/*.test.{ts,tsx}"],
  output: "./",
  options: {
    debug: false,
    removeUnusedKeys: true,
    sort: true,
    func: {
      list: ["t", "i18next.t", "i18n.t"],
      extensions: [],
    },
    trans: {
      component: "Trans",
      i18nKey: "i18nKey",
      defaultsKey: "defaults",
      extensions: [],
    },
    lngs: ["en", "uk"],
    ns: ["translation"],
    defaultLng: "en",
    defaultNs: "translation",
    defaultValue: function (lng, _ns, key) {
      if (lng === "en") {
        return key;
      }
      return "";
    },
    resource: {
      loadPath: "src/clients/locales/{{lng}}.json",
      savePath: "src/clients/locales/{{lng}}.json",
      jsonIndent: 2,
      lineEnding: "\n",
    },
    keySeparator: false,
    nsSeparator: false,
    interpolation: {
      prefix: "{{",
      suffix: "}}",
    },
  },
  transform: typescriptTransform({
    extensions: [".ts", ".tsx"],
  }),
};
