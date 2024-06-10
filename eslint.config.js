import globals from "globals";
import pluginJs from "@eslint/js";
import pluginVue from "eslint-plugin-vue";


export default [
  ...pluginVue.configs['flat/recommended'],
  {
    ...pluginJs.configs.recommended,
    ignores: ["dist/**","dist-electron/**"]
  },
  {
    files: ["electron/**"],
    languageOptions: {
      globals:  {
        ...globals.node
      }
    },
  },
  {
    files: ["src/**"],
    languageOptions: {
      globals:  {
        ...globals.browser
      }
    },
  },
  {
    files: ["vite.config.js"],
    languageOptions: {
      globals:  {
        ...globals.node
      }
    }
  }
];
