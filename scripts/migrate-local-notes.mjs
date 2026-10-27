// Usage: node scripts/migrate-local-notes.mjs --uid FIREBASE_UID [--apply]
// Defaults to a dry run. Never overwrites an existing Firestore note.
import { readFile } from 'node:fs/promises';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { noteInput, validId } from '../lib/note.ts';
import { studySchema } from '../lib/study.ts';
const uid=process.argv[process.argv.indexOf('--uid')+1];
if(!process.argv.includes('--uid')||!uid||uid.includes('/'))throw new Error('Supply the UID of your Firebase account with --uid.');
const credentials=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||await readFile('.firebase-service-account.json','utf8'));
if(credentials.project_id!=='studybuddy-5466f')throw new Error('Wrong Firebase project.');
const app=initializeApp({credential:cert(credentials)});await getAuth(app).getUser(uid);
const db=getFirestore(app);const backup=JSON.parse(await readFile('.sites-runtime/legacy-backup.json','utf8'));
const notes=(backup.notes||[]).map(n=>{
 const input=noteInput.parse(n);const now=new Date().toISOString();
 const createdAt=Number.isNaN(Date.parse(n.createdAt))?now:new Date(n.createdAt).toISOString();
 const updatedAt=Number.isNaN(Date.parse(n.updatedAt))?createdAt:new Date(n.updatedAt).toISOString();
 return {id:validId.parse(n.id),...input,createdAt,updatedAt,revision:1,...(n.pack?{pack:studySchema.parse(n.pack)}:{})};
});
console.log(JSON.stringify({notes:notes.length,dryRun:!process.argv.includes('--apply')}));
if(process.argv.includes('--apply')){
 let imported=0;
 for(const {id,...data} of notes){
  const owner=db.collection('users').doc(uid);const ref=owner.collection('notes').doc(id);
  await db.runTransaction(async tx=>{
   const [existing,meta]=await Promise.all([tx.get(ref),tx.get(owner)]);
   if(existing.exists)return;
   const count=Number(meta.data()?.noteCount||0);if(count>=200)throw new Error('Library limit reached.');
   tx.create(ref,data);tx.set(owner,{noteCount:count+1},{merge:true});
  });
  imported++;
 }
 console.log(JSON.stringify({processed:imported,originalBackupPreserved:true}));
}
