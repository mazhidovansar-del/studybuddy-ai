import { copyFile, mkdir } from 'node:fs/promises';
await mkdir(new URL('../public/',import.meta.url),{recursive:true});
await copyFile(new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',import.meta.url),new URL('../public/pdf.worker.min.mjs',import.meta.url));
