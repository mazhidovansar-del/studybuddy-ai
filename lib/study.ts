import { z } from "zod";

export const studySchema = z.object({
  summary: z.string().min(1).max(20000),
  keyPoints: z.array(z.string().min(1).max(2000)).min(1).max(12),
  flashcards: z.array(z.object({ question: z.string().min(1).max(2000), answer: z.string().min(1).max(4000) })).min(1).max(12),
  quiz: z.array(z.object({ question: z.string().min(1).max(2000), options: z.array(z.string().min(1).max(2000)).length(4), correctIndex: z.number().int().min(0).max(3), explanation: z.string().min(1).max(4000) })).min(1).max(10),
});
export type StudyPack = z.infer<typeof studySchema>;
const string = { type: "string" };
const object = (properties: Record<string, unknown>) => ({ type: "object", additionalProperties: false, properties, required: Object.keys(properties) });
export const studyJsonSchema = object({
  summary: string,
  keyPoints: { type: "array", items: string },
  flashcards: { type: "array", items: object({ question: string, answer: string }) },
  quiz: { type: "array", items: object({ question: string, options: { type: "array", items: string }, correctIndex: { type: "integer" }, explanation: string }) },
});
export function exportStudy(title: string, pack: StudyPack) {
  return `# ${title}\n\n## Summary\n\n${pack.summary}\n\n## Key points\n\n${pack.keyPoints.map(p => `- ${p}`).join("\n")}\n\n## Flashcards\n\n${pack.flashcards.map((c,i) => `${i+1}. ${c.question}\n\n   ${c.answer}`).join("\n\n")}\n\n## Quiz\n\n${pack.quiz.map((q,i) => `${i+1}. ${q.question}\n${q.options.map((o,j) => `   ${String.fromCharCode(65+j)}. ${o}`).join("\n")}`).join("\n\n")}\n\n## Answer key\n\n${pack.quiz.map((q,i) => `${i+1}. ${String.fromCharCode(65+q.correctIndex)} — ${q.explanation}`).join("\n\n")}`;
}
export function validateUpload(file: { name: string; size: number }) {
  if (!/\.(pdf|txt|md|mp3|mp4|mpeg|mpga|m4a|wav|webm)$/i.test(file.name)) return "Choose a PDF, TXT, Markdown, MP3, M4A, WAV, MP4 or WebM file.";
  if (!file.size) return "This file is empty. Choose a file containing study notes.";
  if (file.size > 20_000_000) return "Choose a file smaller than 20 MB.";
  if (/\.(txt|md)$/i.test(file.name) && file.size > 200_000) return "Text notes must be under 200 KB. Split this file into smaller chapters.";
  return null;
}
