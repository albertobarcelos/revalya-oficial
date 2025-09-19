import type { StorybookConfig } from '@storybook/react';

const config: StorybookConfig = {
  stories: [
    '../**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../examples/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../prime/**/*.stories.@(js|jsx|ts|tsx|mdx)'
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-docs',
    '@storybook/addon-controls',
    '@storybook/addon-actions',
    '@storybook/addon-viewport',
    '@storybook/addon-backgrounds',
    '@storybook/addon-toolbars',
    '@storybook/addon-measure',
    '@storybook/addon-outline',
    '@storybook/addon-a11y'
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {}
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  docs: {
    autodocs: 'tag',
    defaultName: 'Documentação'
  },
  staticDirs: ['../public'],
  webpackFinal: async (config) => {
    // Configurações customizadas do Webpack
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname, '../'),
        '@/components': require('path').resolve(__dirname, '../prime'),
        '@/utils': require('path').resolve(__dirname, '../utils'),
        '@/types': require('path').resolve(__dirname, '../types'),
        '@/examples': require('path').resolve(__dirname, '../examples')
      };
    }
    
    return config;
  },
  features: {
    buildStoriesJson: true,
    storyStoreV7: true
  },
  core: {
    disableTelemetry: true
  }
};

export default config;
