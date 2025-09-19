// Configuração do Rollup para build da biblioteca de componentes PrimeReact

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

const isProduction = process.env.NODE_ENV === 'production';

const external = [
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.dependencies || {}),
  'react/jsx-runtime'
];

const plugins = [
  peerDepsExternal(),
  resolve({
    browser: true,
    preferBuiltins: false
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: true,
    declarationDir: 'dist/types',
    exclude: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.stories.ts',
      '**/*.stories.tsx',
      '**/examples/**/*'
    ]
  })
];

if (isProduction) {
  plugins.push(
    terser({
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      mangle: {
        reserved: ['React', 'ReactDOM']
      }
    })
  );
}

export default [
  // ESM build
  {
    input: 'index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: !isProduction
    },
    external,
    plugins
  },
  // CommonJS build
  {
    input: 'index.ts',
    output: {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'named'
    },
    external,
    plugins
  },
  // UMD build (para uso em browser)
  {
    input: 'index.ts',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'PrimeComponents',
      sourcemap: !isProduction,
      globals: {
        'react': 'React',
        'react-dom': 'ReactDOM',
        'primereact/button': 'PrimeReact.Button',
        'primereact/inputtext': 'PrimeReact.InputText',
        'primereact/dropdown': 'PrimeReact.Dropdown',
        'primereact/datatable': 'PrimeReact.DataTable',
        'primereact/card': 'PrimeReact.Card',
        'primereact/toast': 'PrimeReact.Toast',
        'primereact/column': 'PrimeReact.Column',
        'primereact/toolbar': 'PrimeReact.Toolbar',
        'primereact/sidebar': 'PrimeReact.Sidebar',
        'primereact/menubar': 'PrimeReact.Menubar',
        'primereact/breadcrumb': 'PrimeReact.Breadcrumb',
        'primereact/panel': 'PrimeReact.Panel',
        'primereact/tabview': 'PrimeReact.TabView',
        'primereact/tabpanel': 'PrimeReact.TabPanel',
        'primereact/dialog': 'PrimeReact.Dialog',
        'primereact/confirmdialog': 'PrimeReact.ConfirmDialog',
        'primereact/calendar': 'PrimeReact.Calendar',
        'primereact/inputnumber': 'PrimeReact.InputNumber',
        'primereact/inputmask': 'PrimeReact.InputMask',
        'primereact/textarea': 'PrimeReact.Textarea',
        'primereact/checkbox': 'PrimeReact.Checkbox',
        'primereact/radiobutton': 'PrimeReact.RadioButton',
        'primereact/multiselect': 'PrimeReact.MultiSelect',
        'primereact/fileupload': 'PrimeReact.FileUpload',
        'primereact/password': 'PrimeReact.Password',
        'primereact/inputswitch': 'PrimeReact.InputSwitch',
        'primereact/slider': 'PrimeReact.Slider',
        'primereact/rating': 'PrimeReact.Rating',
        'primereact/colorpicker': 'PrimeReact.ColorPicker',
        'primereact/chips': 'PrimeReact.Chips',
        'primereact/autocomplete': 'PrimeReact.AutoComplete',
        'primereact/cascadeselect': 'PrimeReact.CascadeSelect',
        'primereact/treeselect': 'PrimeReact.TreeSelect',
        'primereact/tristatecheckbox': 'PrimeReact.TriStateCheckbox',
        'primereact/togglebutton': 'PrimeReact.ToggleButton',
        'primereact/selectbutton': 'PrimeReact.SelectButton',
        'primereact/splitbutton': 'PrimeReact.SplitButton',
        'primereact/speeddial': 'PrimeReact.SpeedDial',
        'primereact/menu': 'PrimeReact.Menu',
        'primereact/contextmenu': 'PrimeReact.ContextMenu',
        'primereact/megamenu': 'PrimeReact.MegaMenu',
        'primereact/panelmenu': 'PrimeReact.PanelMenu',
        'primereact/steps': 'PrimeReact.Steps',
        'primereact/tieredmenu': 'PrimeReact.TieredMenu',
        'primereact/dock': 'PrimeReact.Dock',
        'primereact/message': 'PrimeReact.Message',
        'primereact/messages': 'PrimeReact.Messages',
        'primereact/inlinemessage': 'PrimeReact.InlineMessage',
        'primereact/progressbar': 'PrimeReact.ProgressBar',
        'primereact/progressspinner': 'PrimeReact.ProgressSpinner',
        'primereact/skeleton': 'PrimeReact.Skeleton',
        'primereact/avatar': 'PrimeReact.Avatar',
        'primereact/avatargroup': 'PrimeReact.AvatarGroup',
        'primereact/badge': 'PrimeReact.Badge',
        'primereact/chip': 'PrimeReact.Chip',
        'primereact/tag': 'PrimeReact.Tag',
        'primereact/divider': 'PrimeReact.Divider',
        'primereact/splitter': 'PrimeReact.Splitter',
        'primereact/splitterpanel': 'PrimeReact.SplitterPanel',
        'primereact/scrollpanel': 'PrimeReact.ScrollPanel',
        'primereact/accordion': 'PrimeReact.Accordion',
        'primereact/accordiontab': 'PrimeReact.AccordionTab',
        'primereact/fieldset': 'PrimeReact.Fieldset',
        'primereact/toolbar': 'PrimeReact.Toolbar',
        'primereact/overlaypanel': 'PrimeReact.OverlayPanel',
        'primereact/tooltip': 'PrimeReact.Tooltip',
        'primereact/tree': 'PrimeReact.Tree',
        'primereact/treetable': 'PrimeReact.TreeTable',
        'primereact/timeline': 'PrimeReact.Timeline',
        'primereact/organizationchart': 'PrimeReact.OrganizationChart',
        'primereact/galleria': 'PrimeReact.Galleria',
        'primereact/image': 'PrimeReact.Image',
        'primereact/carousel': 'PrimeReact.Carousel',
        'primereact/captcha': 'PrimeReact.Captcha',
        'primereact/defer': 'PrimeReact.Defer',
        'primereact/inplace': 'PrimeReact.Inplace',
        'primereact/blockui': 'PrimeReact.BlockUI',
        'primereact/virtualscroller': 'PrimeReact.VirtualScroller',
        'primereact/terminal': 'PrimeReact.Terminal',
        'react-hook-form': 'ReactHookForm',
        'zod': 'Zod',
        'date-fns': 'DateFns',
        'clsx': 'clsx'
      }
    },
    external,
    plugins
  }
];