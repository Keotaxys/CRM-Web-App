import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const projectId = process.argv[2];
if (!projectId) throw new Error('Usage: node scripts/capture-production-baseline.mjs <project-id>');
const authModule = await import('firebase-tools/lib/auth.js');
const apiModule = await import('firebase-tools/lib/apiv2.js');
const firebaseAuth = authModule.default ?? authModule;
const firebaseApi = apiModule.default ?? apiModule;
const account = firebaseAuth.getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login is required');
firebaseAuth.setRefreshToken(account.tokens.refresh_token);
const accessToken = await firebaseApi.getAccessToken();

async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json', ...(options.headers ?? {}) } });
  if (!response.ok) throw new Error(`Read-only API request failed (${response.status}) for ${new URL(url).hostname}`);
  return response.json();
}

async function rules(service) {
  const releaseList = await api(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases?pageSize=100`);
  const release = (releaseList.releases ?? []).filter((item) => item.name.startsWith(`projects/${projectId}/releases/${service}`)).sort((a,b) => (b.updateTime ?? b.createTime).localeCompare(a.updateTime ?? a.createTime))[0];
  if (!release) throw new Error(`No ${service} Rules release found`);
  const ruleset = await api(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
  return { release: { name: release.name, rulesetName: release.rulesetName, createTime: release.createTime, updateTime: release.updateTime }, files: ruleset.source?.files ?? [] };
}

async function countCollection(collectionId) {
  const body = { structuredAggregationQuery: { aggregations: [{ alias: 'count', count: {} }], structuredQuery: { from: [{ collectionId }] } } };
  const result = await api(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runAggregationQuery`, { method: 'POST', body: JSON.stringify(body) });
  return Number(result.find((item) => item.result)?.result?.aggregateFields?.count?.integerValue ?? 0);
}

async function branchValues(collectionId) {
  const body = { structuredQuery: { select: { fields: [{ fieldPath: 'branchId' }, { fieldPath: 'branch' }] }, from: [{ collectionId }] } };
  const result = await api(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, { method: 'POST', body: JSON.stringify(body) });
  return result.filter((item) => item.document).map((item) => { const fields = item.document.fields ?? {}; return { id:item.document.name.split('/').pop(), values:[fields.branchId?.stringValue, fields.branch?.stringValue].filter(Boolean) }; });
}

function idDigest(rows) { return createHash('sha256').update(rows.map((row)=>row.id).sort().join('\n')).digest('hex'); }

async function storageInventory(bucket) {
  const prefixCounts = {}; let total = 0; let pageToken = '';
  do {
    const params = new URLSearchParams({ fields: 'items(name),nextPageToken', maxResults: '1000' }); if (pageToken) params.set('pageToken', pageToken);
    const page = await api(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?${params}`);
    for (const item of page.items ?? []) { total += 1; const prefix = item.name.includes('/') ? item.name.split('/')[0] : '(root)'; prefixCounts[prefix] = (prefixCounts[prefix] ?? 0) + 1; }
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);
  return { bucket, objectCount: total, prefixCounts };
}

async function authInventory() {
  const rows=[];let pageToken='';
  do { const params=new URLSearchParams({maxResults:'1000'});if(pageToken)params.set('nextPageToken',pageToken);const page=await api(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchGet?${params}`);rows.push(...(page.users??[]).map((user)=>({id:user.localId})));pageToken=page.nextPageToken??''; } while(pageToken);
  return rows;
}

const [project, firestoreRules, storageRules, customerCount, userCount, customerRows, userRows] = await Promise.all([
  api(`https://firebase.googleapis.com/v1beta1/projects/${projectId}`), rules('cloud.firestore'), rules('firebase.storage'), countCollection('customers'), countCollection('users'), branchValues('customers'), branchValues('users'),
]);
const storageBucket = project.resources?.storageBucket ?? `${projectId}.firebasestorage.app`;
const [inventory,authRows] = await Promise.all([storageInventory(storageBucket),authInventory()]);
const outputDirectory = `artifacts/pre-upgrade-baseline-${new Date().toISOString().slice(0,10)}`;
await mkdir(outputDirectory, { recursive: true });
for (const [kind, ruleData] of [['firestore',firestoreRules],['storage',storageRules]]) {
  const content = ruleData.files.map((file) => `// Source: ${file.name}\n${file.content}`).join('\n');
  await writeFile(`${outputDirectory}/${kind}.rules`, content, 'utf8');
  await writeFile(`${outputDirectory}/${kind}-release.json`, JSON.stringify(ruleData.release,null,2), 'utf8');
}
const baseline = { capturedAt:new Date().toISOString(),projectId,projectNumber:project.projectNumber,state:project.state,resources:{hostingSite:project.resources?.hostingSite,locationId:project.resources?.locationId,storageBucket},customerCount,userCount,authUserCount:authRows.length,idDigests:{customersSha256:idDigest(customerRows),userDocumentsSha256:idDigest(userRows),authUidsSha256:idDigest(authRows)},branchValues:[...new Set([...customerRows.flatMap((row)=>row.values),...userRows.flatMap((row)=>row.values)])].sort(),storage:inventory,note:'Read-only capture; no production mutation or deployment performed. ID digests allow post-migration preservation verification without exposing IDs.' };
await writeFile(`${outputDirectory}/inventory.json`, JSON.stringify(baseline,null,2), 'utf8');
console.log(JSON.stringify({ outputDirectory, customerCount, userDocumentCount:userCount, authUserCount:authRows.length, branchValueCount:baseline.branchValues.length, storageObjectCount:inventory.objectCount, ruleSetsCaptured:2 },null,2));
