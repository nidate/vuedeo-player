import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/**', 'dist-electron/**']
  },
  ...pluginVue.configs['flat/recommended'],
  {
    ...pluginJs.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ['src/**'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  {
    ...eslintConfigPrettier
  }
];
