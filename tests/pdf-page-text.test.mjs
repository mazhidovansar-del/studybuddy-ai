import test from 'node:test';
import assert from 'node:assert/strict';
import { readPdfPageText } from '../lib/pdf-page-text.ts';

function pageWithChunks(chunks, onCancel) {
  const stream = new ReadableStream({
    start(controller) { for (const items of chunks) controller.enqueue({items}); controller.close(); },
    cancel: onCancel,
  });
  Object.defineProperty(stream, Symbol.asyncIterator, {value: undefined});
  return {stream, streamTextContent: () => stream};
}
test('reads all text chunks without ReadableStream async iteration', async () => {
  const page=pageWithChunks([[{str:'Biology',hasEOL:true}], [{type:'beginMarkedContent'},{str:'Cells',hasEOL:false}]]);
  assert.equal(await readPdfPageText(page, 200000), 'Biology\nCells ');
  assert.equal(page.stream.locked,false);
});
test('stops excessive text and releases the reader', async () => {
  let cancelled=false;
  const page=pageWithChunks([[{str:'too much text'}],[{str:'unread'}]],()=>{cancelled=true;});
  await assert.rejects(readPdfPageText(page,3),/Split this PDF/);
  assert.equal(cancelled,true);
  assert.equal(page.stream.locked,false);
});
test('propagates a failed read and releases its reader', async () => {
  const stream=new ReadableStream({start(controller){controller.error(new Error('PDF read failed'));}});
  await assert.rejects(readPdfPageText({streamTextContent:()=>stream},200000),/PDF read failed/);
  assert.equal(stream.locked,false);
});
