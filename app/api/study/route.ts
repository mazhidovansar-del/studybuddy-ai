import { studyInstructions } from '@/lib/study-instructions';
import { ApiError, apiError, database, noteCollection, readJson, requireUser } from '@/lib/server/firebase';
import { validId } from '@/lib/note';
import { studySchema, studyJsonSchema } from '@/lib/study';
import { FieldValue } from 'firebase-admin/firestore';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request:Request) {
  try {
    const user=await requireUser(request);const id=new URL(request.url).searchParams.get('id');
    if(!id)return Response.json({configured:!!process.env.GEMINI_API_KEY});
    if(!validId.safeParse(id).success)throw new ApiError('Invalid note ID.');
    const note=await noteCollection(user.uid).doc(id).get();
    if(!note.exists)throw new ApiError('Note not found.',404);
    return Response.json({pack:note.data()?.pack||null},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return apiError(e);}
}
export async function POST(request:Request) {
  let release:(()=>Promise<void>)|undefined;
  try {
    const user=await requireUser(request);
    if(!user.email_verified)throw new ApiError('Verify your email before generating study materials.',403);
    if(!process.env.GEMINI_API_KEY)throw new ApiError('AI connection is not configured.',503);
    const body=await readJson(request);const id=validId.safeParse(body?.id);
    if(!id.success)throw new ApiError('Choose a saved note.');
    const db=database();const ref=noteCollection(user.uid).doc(id.data);
    const day=new Date().toISOString().slice(0,10);const globalQuota=db.collection('generationUsage').doc(day);const userQuota=db.collection('users').doc(user.uid).collection('usage').doc(day);
    const lock=crypto.randomUUID();
    const note=await db.runTransaction(async tx=>{
      const [snapshot,global,userLimit]=await Promise.all([tx.get(ref),tx.get(globalQuota),tx.get(userQuota)]);
      if(!snapshot.exists)throw new ApiError('Note not found.',404);
      const data=snapshot.data()!;if(data.pack && body.regenerate!==true)return data;
      if(!String(data.content||'').trim())throw new ApiError('Add some readable text first.');
      if(Number(data.generatingUntil||0)>Date.now())throw new ApiError('This note is already being generated. Try again shortly.',409);
      if(Number(userLimit.data()?.count||0)>=10)throw new ApiError('Daily limit reached: 10 generations. Try again tomorrow (UTC).',429);
      if(Number(global.data()?.count||0)>=45)throw new ApiError('The shared daily AI limit has been reached. Try again tomorrow (UTC).',429);
      tx.set(globalQuota,{count:Number(global.data()?.count||0)+1});tx.set(userQuota,{count:Number(userLimit.data()?.count||0)+1});
      tx.update(ref,{generatingUntil:Date.now()+65000,generationLock:lock});return data;
    });
    if(note.pack && body.regenerate!==true)return Response.json({pack:note.pack});
    release=()=>db.runTransaction(async tx=>{const current=await tx.get(ref);if(current.data()?.generationLock===lock)tx.update(ref,{generatingUntil:FieldValue.delete(),generationLock:FieldValue.delete()});});
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',{
      method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY!,'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),
      body:JSON.stringify({
        systemInstruction:{parts:[{text:studyInstructions(String(note.content))}]},
        contents:[{role:'user',parts:[{text:note.content}]}],
        generationConfig:{maxOutputTokens:10000,responseMimeType:'application/json',responseJsonSchema:studyJsonSchema},
      }),
    });
    if(!response.ok)throw new ApiError(response.status===429?'Gemini quota reached or service is busy. Retry later.':response.status===400||response.status===401||response.status===403?'Gemini rejected the request. Check the server API key and project access.':'AI service is unavailable. Your note is saved; retry later.',503);
    const result=await response.json() as {candidates?:{finishReason?:string;content?:{parts?:{text?:string;thought?:boolean}[]}}[]};
    const candidate=result.candidates?.[0];
    const generated=candidate?.content?.parts?.filter(part=>!part.thought).map(part=>part.text||'').join('');
    if(candidate?.finishReason!=='STOP'||!generated)throw new ApiError('The model could not complete these materials. Try a shorter source.',422);
    let json:unknown;
    try {json=JSON.parse(generated);}catch{throw new ApiError('The AI returned invalid study materials. Please retry.',422);}
    const parsed=studySchema.safeParse(json);
    if(!parsed.success)throw new ApiError('The AI returned incomplete study materials. Please retry.',422);
    const pack=parsed.data;
    if(Buffer.byteLength(JSON.stringify(pack))>300000)throw new ApiError('Generated materials are too large. Use a shorter source.',422);
    await db.runTransaction(async tx=>{
      const current=await tx.get(ref);
      if(!current.exists)throw new ApiError('This note was deleted.',404);
      if(current.data()?.revision!==note.revision||current.data()?.generationLock!==lock)throw new ApiError('The note changed during generation. Generate again from the latest text.',409);
      tx.update(ref,{pack,updatedAt:new Date().toISOString(),generatingUntil:FieldValue.delete(),generationLock:FieldValue.delete()});
    });
    return Response.json({pack});
  }catch(e){return apiError(e);}
  finally {if(release)await release().catch(()=>undefined);}
}
