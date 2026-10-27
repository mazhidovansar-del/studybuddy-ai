import assert from 'node:assert/strict';
import test from 'node:test';
import { studySchema, validateUpload, exportStudy } from '../lib/study.ts';
const pack = { summary:'Plants convert light to chemical energy.', keyPoints:['Chlorophyll absorbs light.'], flashcards:[{question:'What absorbs light?',answer:'Chlorophyll.'}], quiz:[{question:'What absorbs light?',options:['Chlorophyll','Starch','Water','Sugar'],correctIndex:0,explanation:'Chlorophyll is the light-absorbing pigment.'}] };
test('rejects unsupported, empty and excessive files',()=>{
 assert.ok(validateUpload({name:'notes.exe',size:100}));
 assert.ok(validateUpload({name:'notes.pdf',size:0}));
 assert.ok(validateUpload({name:'notes.pdf',size:20_000_001}));
 assert.ok(validateUpload({name:'notes.txt',size:200_001}));
 assert.equal(validateUpload({name:'NOTES.PDF',size:100}),null);
});
test('rejects invalid generated questions before they can be saved',()=>{
 assert.equal(studySchema.safeParse(pack).success,true);
 assert.equal(studySchema.safeParse({...pack,quiz:[{...pack.quiz[0],correctIndex:4}]}).success,false);
 assert.equal(studySchema.safeParse({...pack,quiz:[{...pack.quiz[0],options:['one']}]}).success,false);
 assert.equal(studySchema.safeParse({...pack,flashcards:[]}).success,false);
});
test('exports study content and a separate answer key',()=>{
 const text=exportStudy('Biology',pack);
 assert.match(text,/## Summary/);assert.match(text,/## Flashcards/);assert.match(text,/## Quiz/);
 assert.ok(text.indexOf('## Answer key')>text.indexOf('## Quiz'));
 assert.match(text,/1\. A — Chlorophyll/);
});
