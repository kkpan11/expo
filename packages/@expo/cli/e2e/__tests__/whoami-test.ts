/* eslint-env jest */
import fs from 'fs/promises';
import os from 'os';

import { getLoadedModulesAsync, projectRoot } from './utils';
import { executeExpoAsync } from '../utils/expo';

const originalForceColor = process.env.FORCE_COLOR;
beforeAll(async () => {
  await fs.mkdir(projectRoot, { recursive: true });
  process.env.FORCE_COLOR = '0';
});
afterAll(() => {
  process.env.FORCE_COLOR = originalForceColor;
});

it('loads expected modules by default', async () => {
  const modules = await getLoadedModulesAsync(`require('../../build/src/whoami');`);
  expect(modules).toStrictEqual([
    '@expo/cli/build/src/log.js',
    '@expo/cli/build/src/utils/args.js',
    '@expo/cli/build/src/utils/errors.js',
    '@expo/cli/build/src/whoami/index.js',
  ]);
});

it('runs `npx expo whoami --help`', async () => {
  const results = await executeExpoAsync(projectRoot, ['whoami', '--help']);
  expect(results.stdout).toMatchInlineSnapshot(`
    "
      Info
        Show the currently authenticated username

      Usage
        $ npx expo whoami

      Options
        -h, --help    Usage info
    "
  `);
});

it('throws on invalid project root', async () => {
  await expect(
    executeExpoAsync(projectRoot, ['very---invalid', 'whoami'], { verbose: false })
  ).rejects.toThrow(/^Invalid project root: .*very---invalid$/m);
});

it('runs `npx expo whoami`', async () => {
  const results = await executeExpoAsync(projectRoot, ['whoami'], { verbose: false }).catch(
    (e) => e
  );

  // Test logged in or logged out.
  if (results.stderr) {
    expect(results.stderr.trim()).toBe('Not logged in');
  } else {
    expect(results.stdout.trim()).toBeTruthy();
    // Ensure this can always be used as a means of automation.
    expect(results.stdout.trim().split(os.EOL).length).toBe(1);
  }
});

if (process.env.CI) {
  it('runs `npx expo whoami` and throws logged out error', async () => {
    await expect(executeExpoAsync(projectRoot, ['whoami'], { verbose: false })).rejects.toThrow(
      /Not logged in/
    );
  });
}
