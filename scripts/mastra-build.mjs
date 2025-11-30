import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUTPUT_DIR = '.mastra/output';
const ENTRY_BUNDLE = `${OUTPUT_DIR}/mastra.mjs`;
const ENTRY_BUNDLE_TYPES = `${ENTRY_BUNDLE}.d.ts`;

const ensureStubEntrypoint = () => {
  mkdirSync(resolve(OUTPUT_DIR), { recursive: true });
  const stub = [
    'export const mastra = null;',
    'export default mastra;',
    '',
  ].join('\n');
  writeFileSync(resolve(ENTRY_BUNDLE), stub, 'utf8');
  const stubTypes = [
    "import type { Mastra } from '@mastra/core/mastra';",
    'export const mastra: Mastra;',
    'export default mastra;',
    '',
  ].join('\n');
  writeFileSync(resolve(ENTRY_BUNDLE_TYPES), stubTypes, 'utf8');
};

const runTypeScriptBuild = () => {
  const tscArgs = [
    '--project',
    'tsconfig.json',
    '--outDir',
    OUTPUT_DIR,
    '--noEmit',
    'false',
  ];

  execSync(`npx tsc ${tscArgs.join(' ')}`, { stdio: 'inherit' });
};

const writeEntrypoint = () => {
  const entryContent = [
    "import mastra from './src/mastra/index.js';",
    'export { mastra };',
    'export default mastra;',
    '',
  ].join('\n');

  mkdirSync(resolve(OUTPUT_DIR), { recursive: true });
  const typeContent = [
    "import type { Mastra } from '@mastra/core/mastra';",
    'export const mastra: Mastra;',
    'export default mastra;',
    '',
  ].join('\n');

  writeFileSync(resolve(ENTRY_BUNDLE), entryContent, 'utf8');
  writeFileSync(resolve(ENTRY_BUNDLE_TYPES), typeContent, 'utf8');
};

ensureStubEntrypoint();
runTypeScriptBuild();
writeEntrypoint();
