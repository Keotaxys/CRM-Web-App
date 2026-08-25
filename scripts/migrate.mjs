import { readFile } from 'node:fs/promises';
import { analyzeSnapshot, auditStorageObjects } from './migration/core.mjs';
import { applyMigration } from './migration/apply.mjs';

function argsOf(argv) { const result = { apply: false }; for (let i=0;i<argv.length;i+=1) { const value=argv[i]; if(value==='--apply') result.apply=true; else if(value.startsWith('--')) result[value.slice(2)]=argv[++i]; } return result; }
function assertApplyGuard(args) { if (!args.project || args.project !== args['confirm-project'] || process.env.ALLOW_PRODUCTION_MIGRATION !== args.project) throw new Error('Apply blocked: require matching --project, --confirm-project, and ALLOW_PRODUCTION_MIGRATION'); }

async function adminServices(projectId) {
  const [{ initializeApp, applicationDefault }, { getFirestore, FieldValue }, { getAuth }, { getStorage }] = await Promise.all([import('firebase-admin/app'), import('firebase-admin/firestore'), import('firebase-admin/auth'), import('firebase-admin/storage')]);
  const app = initializeApp({ credential: applicationDefault(), projectId, storageBucket: `${projectId}.firebasestorage.app` });
  return { db: getFirestore(app), auth: getAuth(app), bucket: getStorage(app).bucket(), FieldValue };
}

async function liveSnapshot(services) {
  const authUsers=[];let nextPageToken;
  do { const page=await services.auth.listUsers(1000,nextPageToken);authUsers.push(...page.users.map((user)=>({uid:user.uid,email:user.email??null,photoURL:user.photoURL??''})));nextPageToken=page.pageToken; } while(nextPageToken);
  const [customerSnapshot, userSnapshot, files] = await Promise.all([services.db.collection('customers').get(), services.db.collection('users').get(), services.bucket.getFiles()]);
  return { customers: customerSnapshot.docs.map((item) => ({ id:item.id,...item.data() })), users:userSnapshot.docs.map((item)=>({uid:item.id,...item.data()})), authUsers, storageObjects:files[0].map((file)=>file.name) };
}

async function firebaseCliAccessToken() {
  const authModule=await import('firebase-tools/lib/auth.js');const apiModule=await import('firebase-tools/lib/apiv2.js');const firebaseAuth=authModule.default??authModule;const firebaseApi=apiModule.default??apiModule;const account=firebaseAuth.getGlobalDefaultAccount();if(!account?.tokens?.refresh_token)throw new Error('Firebase CLI login is required for live dry-run');firebaseAuth.setRefreshToken(account.tokens.refresh_token);return firebaseApi.getAccessToken();
}
async function restJson(url,token,options={}){const response=await fetch(url,{...options,headers:{authorization:`Bearer ${token}`,'content-type':'application/json'}});if(!response.ok)throw new Error(`Read-only API failed (${response.status})`);return response.json();}
function decodedDocument(item,idField){const document=item.document;if(!document)return null;const result={[idField]:document.name.split('/').pop()};for(const [key,value] of Object.entries(document.fields??{}))result[key]=value.stringValue??value.timestampValue??value.nullValue??null;return result;}
async function remoteDrySnapshot(projectId){
  const token=await firebaseCliAccessToken();
  const runQuery=async(collectionId,fields,idField)=>{const body={structuredQuery:{select:{fields:fields.map((fieldPath)=>({fieldPath}))},from:[{collectionId}]}};const rows=await restJson(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,token,{method:'POST',body:JSON.stringify(body)});return rows.map((item)=>decodedDocument(item,idField)).filter(Boolean);};
  const authUsers=[];let authPageToken='';do{const params=new URLSearchParams({maxResults:'1000'});if(authPageToken)params.set('nextPageToken',authPageToken);const page=await restJson(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchGet?${params}`,token);authUsers.push(...(page.users??[]).map((user)=>({uid:user.localId})));authPageToken=page.nextPageToken??'';}while(authPageToken);
  const [customers,users,project]=await Promise.all([runQuery('customers',['branch','branchId','status','createdAt','gps','imageUrl','placeImageUrl','imageStoragePath','placeImageStoragePath'],'id'),runQuery('users',['branch','branchId','role','accountStatus','photoURL'],'uid'),restJson(`https://firebase.googleapis.com/v1beta1/projects/${projectId}`,token)]);
  const bucket=project.resources?.storageBucket??`${projectId}.firebasestorage.app`;const storageObjects=[];let pageToken='';do{const params=new URLSearchParams({fields:'items(name),nextPageToken',maxResults:'1000'});if(pageToken)params.set('pageToken',pageToken);const page=await restJson(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?${params}`,token);storageObjects.push(...(page.items??[]).map((item)=>item.name));pageToken=page.nextPageToken??'';}while(pageToken);
  return {customers,users,authUsers,storageObjects};
}

const args=argsOf(process.argv.slice(2));
const fixture=args.fixture ? JSON.parse(await readFile(args.fixture,'utf8')) : null;
if (args.apply) assertApplyGuard(args);
if (args.apply && fixture) throw new Error('Apply mode does not accept fixture input');
if (!fixture && !args.project) throw new Error('Provide --fixture for local dry-run or --project for read-only live dry-run');
const services=fixture||!args.apply ? null : await adminServices(args.project); const snapshot=fixture ?? (args.apply ? await liveSnapshot(services) : await remoteDrySnapshot(args.project));
const orphanAudit=auditStorageObjects([...(snapshot.customers??[]),...(snapshot.users??[])],snapshot.storageObjects??[]);
if(!fixture&&!args['include-orphan-paths']) delete orphanAudit.potentialOrphanPaths;
const report={ mode:args.apply?'APPLY':'DRY_RUN', project:args.project??'fixture', ...analyzeSnapshot(snapshot), orphanAudit };
if(args.apply&&report.migrationConflictCount>0) throw new Error('Apply blocked: resolve every migration conflict first');
if(args.apply&&report.userDocumentsMissingAuth>0) throw new Error('Apply blocked: user documents without Firebase Auth accounts require review');
if (args.apply) report.applyResult=await applyMigration(snapshot,services,{project:args.project});
console.log(JSON.stringify(report,null,2));
