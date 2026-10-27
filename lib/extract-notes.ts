import { readPdfPageText } from './pdf-page-text';

export async function extractNotes(file: File): Promise<string> {
  if (/\.(txt|md)$/i.test(file.name)) return file.text();
  if (!/\.pdf$/i.test(file.name)) throw new Error('Upload a text transcript for audio recordings.');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('/pdf.worker.min.mjs', window.location.origin).toString();
  const task = pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});
  try {
    const pdf=await task.promise;
    if(pdf.numPages>100)throw new Error('Use a PDF with no more than 100 pages.');
    let text='';
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i);
      text+=await readPdfPageText(page, 200000-text.length);
      text+='\n\n';
      if(text.length>200000)throw new Error('Split this PDF into smaller chapters (up to 200,000 characters).');
    }
    if(!text.trim())throw new Error('This PDF contains no readable text. Upload a text version or a PDF with selectable text.');
    return text.trim();
  } finally {await task.destroy();}
}
