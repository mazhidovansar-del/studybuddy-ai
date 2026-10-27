import { ApiError, apiError, database, noteCollection, readJson, requireUser } from '@/lib/server/firebase';
import { noteInput, notePatch, validId } from '@/lib/note';
import { FieldValue } from 'firebase-admin/firestore';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function publicNote(id: string, data: Record<string, unknown>) {
  // Generated packs are fetched separately to keep the library response small.
  return { id, title:data.title, content:data.content, kind:data.kind, folder:data.folder, size:data.size, starred:data.starred, createdAt:data.createdAt, updatedAt:data.updatedAt, revision:data.revision };
}
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const result = await noteCollection(user.uid).orderBy('updatedAt','desc').limit(200).get();
    return Response.json({ notes:result.docs.map(d => publicNote(d.id,d.data())) },{headers:{'Cache-Control':'no-store'}});
  } catch(e) { return apiError(e); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const parsed = noteInput.safeParse(await readJson(request));
    if (!parsed.success) throw new ApiError('Invalid note. Use a title and text under 200,000 characters.');
    const now = new Date().toISOString(); const id = crypto.randomUUID();
    const data = {...parsed.data,createdAt:now,updatedAt:now,revision:1};
    const ref = noteCollection(user.uid).doc(id); const owner = database().collection('users').doc(user.uid);
    await database().runTransaction(async tx => {
      const meta = await tx.get(owner);
      const count = Number(meta.data()?.noteCount || 0);
      if (count >= 200) throw new ApiError('Your library is full (200 notes). Delete a note first.',409);
      tx.create(ref,data);tx.set(owner,{noteCount:count+1},{merge:true});
    });
    return Response.json({note:{id,...data}},{status:201});
  } catch(e) { return apiError(e); }
}
export async function PATCH(request: Request) {
  try {
    const user = await requireUser(request); const parsed=notePatch.safeParse(await readJson(request));
    if(!parsed.success) throw new ApiError('Invalid note update.');
    const {id,...patch}=parsed.data; const ref=noteCollection(user.uid).doc(id);
    const note=await database().runTransaction(async tx => {
      const snap=await tx.get(ref);if(!snap.exists)throw new ApiError('Note not found.',404);
      const changes:Record<string,unknown>={...patch,updatedAt:new Date().toISOString()};
      if(patch.content!==undefined){changes.revision=Number(snap.data()?.revision||1)+1;changes.pack=FieldValue.delete();}
      tx.update(ref,changes);return publicNote(id,{...snap.data(),...changes});
    });
    return Response.json({note});
  } catch(e) { return apiError(e); }
}
export async function DELETE(request: Request) {
  try {
    const user=await requireUser(request);const parsed=validId.safeParse(new URL(request.url).searchParams.get('id'));
    if(!parsed.success)throw new ApiError('Invalid note ID.');
    const ref=noteCollection(user.uid).doc(parsed.data);const owner=database().collection('users').doc(user.uid);
    await database().runTransaction(async tx=>{
      const [snap,meta]=await Promise.all([tx.get(ref),tx.get(owner)]);
      if(snap.exists){tx.delete(ref);tx.set(owner,{noteCount:Math.max(0,Number(meta.data()?.noteCount||1)-1)},{merge:true});}
    });
    return Response.json({deleted:true});
  } catch(e) { return apiError(e); }
}
