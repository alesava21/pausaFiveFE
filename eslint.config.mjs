import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

const features = ['catalog', 'word', 'sudoku', 'game-2048', 'info'];

export default tseslint.config(
  { ignores: ['dist/**', '.angular/**', 'node_modules/**'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  },
  {
    files: ['src/app/core/**/*.ts', 'src/app/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ regex: '(^|/)features/', message: 'Core e shared non importano feature.' }],
        },
      ],
    },
  },
  ...features.map((feature) => ({
    files: [`src/app/features/${feature}/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: features
            .filter((other) => other !== feature)
            .map((other) => ({
              group: [`../${other}/**`, `../../${other}/**`, `**/features/${other}/**`],
              message: 'Una feature non importa direttamente altre feature.',
            })),
        },
      ],
    },
  })),
);
