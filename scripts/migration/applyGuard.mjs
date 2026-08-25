import { validateClaimsArtifact } from '../auth-claims/core.mjs';

export function assertMigrationApplyGuard(args, env = process.env, claimsArtifact) {
  const validated = validateClaimsArtifact(claimsArtifact, args?.project);
  const valid = args?.apply === true
    && Boolean(args.project)
    && args.project === args.confirmProject
    && Boolean(args.claimsSnapshot)
    && typeof args.confirmClaimsDigest === 'string'
    && args.confirmClaimsDigest === validated.digest.value
    && env.ALLOW_PRODUCTION_MIGRATION === args.project;
  if (!valid) {
    throw new Error('Apply blocked: require --apply, matching --project/--confirm-project, --claims-snapshot, matching --confirm-claims-digest, and ALLOW_PRODUCTION_MIGRATION');
  }
  return { claimsSnapshotDigest: validated.digest.value };
}
