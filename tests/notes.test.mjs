import test from 'node:test';
import assert from 'node:assert/strict';
import { noteInput, notePatch, validId } from '../lib/note.ts';
test('validates notes within the Firestore document size budget',()=>{
 assert.ok(noteInput.safeParse({title:'Biology',content:'Photosynthesis'}).success);
 assert.equal(noteInput.safeParse({title:'x',content:'x'.repeat(200001)}).success,false);
 assert.equal(noteInput.safeParse({title:'x',content:'界'.repeat(180000)}).success,false);
});
test('rejects attempts to update ownership, cached packs and server quotas',()=>{
 const id='fb1cf0f3-e355-46b8-b6e6-dd137b6dc452';
 for(const field of ['uid','ownerId','pack','revision','generationLock','noteCount'])assert.equal(notePatch.safeParse({id,[field]:'value'}).success,false);
 assert.ok(notePatch.safeParse({id,content:'updated'}).success);
 assert.equal(validId.safeParse('../another-user').success,false);
});
