/**
 * Sutter Import E2E Test Fixture Generator (Standalone Script)
 *
 * Run manually to pre-generate fixture files:
 *   npx tsx e2e/fixtures/create-sutter-fixtures.ts
 *
 * Note: Fixtures are also auto-generated lazily by the test helper
 * (sutter-fixture-helper.ts) on first test run, so running this
 * script is optional.
 */

import {
  getMultiTabFixturePath,
  getSingleTabFixturePath,
  getNoValidTabsFixturePath,
  getEmptyTabFixturePath,
  getHillFormatFixturePath,
} from './sutter-fixture-helper';

async function main() {
  console.log('Generating Sutter E2E test fixtures...\n');

  const multiTab = await getMultiTabFixturePath();
  console.log(`  Created: ${multiTab}`);

  const singleTab = await getSingleTabFixturePath();
  console.log(`  Created: ${singleTab}`);

  const noValid = await getNoValidTabsFixturePath();
  console.log(`  Created: ${noValid}`);

  const emptyTab = await getEmptyTabFixturePath();
  console.log(`  Created: ${emptyTab}`);

  const hill = await getHillFormatFixturePath();
  console.log(`  Created: ${hill}`);

  console.log('\nAll Sutter E2E test fixtures generated successfully.');
}

main().catch(console.error);
