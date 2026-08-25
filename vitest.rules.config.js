import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Both suites share the same emulator processes; run files serially so one
  // suite cannot clear Firestore while Storage Rules are resolving profiles.
  test: { environment: 'node', globals: true, fileParallelism: false, include: ['tests/rules/**/*.test.js'] },
});
