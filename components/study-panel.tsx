"use client";
import { useEffect, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Download, Layers3, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportStudy, type StudyPack } from "@/lib/study";

export function StudyPanel({ id, title, pack, busy, error, generate, load }: {
  id: string; title: string; pack?: StudyPack; busy: boolean; error?: string;
  generate: () => void; load: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  useEffect(() => { let current = true; load().finally(() => { if (current) setLoading(false); }); return () => { current = false; }; }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setCard(0); setFlipped(false); setAnswers({}); }, [pack]);
  function download() {
    if (!pack) return;
    const url = URL.createObjectURL(new Blob([exportStudy(title, pack)], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `${title.replace(/[\\/:*?"<>|]/g, " ")}-study-pack.md`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!pack) return <section className="study-empty" aria-live="polite">
    {busy || loading ? <Loader2 className="spin" size={30} /> : <Sparkles size={30} />}
    <h2>{busy ? "Creating your study materials…" : loading ? "Loading study materials…" : "Turn this note into a study session"}</h2>
    <p>{busy ? "Reading your source and preparing a summary, flashcards, and quiz. Longer files may take a few minutes." : "Get the key ideas, practise recalling them, then test what you know."}</p>
    {error && <p className="error-message" role="alert">{error}</p>}
    {!busy && !loading && <Button onClick={generate}><Sparkles size={16} /> {error ? "Retry generation" : "Generate study materials"}</Button>}
  </section>;
  const answered = Object.keys(answers).length;
  const score = pack.quiz.filter((q,i) => answers[i] === q.correctIndex).length;
  return <section className="study-results">
    <Button variant="outline" disabled={busy} onClick={generate}>{busy ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />} {busy ? "Updating study materials…" : "Regenerate study materials"}</Button>
    {error && <p className="error-message" role="alert">{error}</p>}
    <Tabs defaultValue="summary">
      <TabsList className="study-tabs"><TabsTrigger value="summary"><BookOpen size={15} /> Summary</TabsTrigger><TabsTrigger value="cards"><Layers3 size={15} /> Flashcards</TabsTrigger><TabsTrigger value="quiz">Quiz</TabsTrigger></TabsList>
      <TabsContent value="summary"><h2>Detailed summary</h2><p className="summary-text">{pack.summary}</p><h3>Key takeaways</h3><ul className="key-points">{pack.keyPoints.map((p,i) => <li key={i}>{p}</li>)}</ul></TabsContent>
      <TabsContent value="cards"><div className="study-section-heading"><h2>Recall, then reveal</h2><span>{card+1} / {pack.flashcards.length}</span></div><button className={`flashcard ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)} aria-label={flipped ? "Show question" : "Reveal answer"}><span>{flipped ? "Answer" : "Question"}</span><strong>{flipped ? pack.flashcards[Math.min(card, pack.flashcards.length - 1)].answer : pack.flashcards[Math.min(card, pack.flashcards.length - 1)].question}</strong><small>{flipped ? "Click to see question" : "Think of the answer, then click to flip"}</small></button><div className="card-controls"><Button variant="outline" disabled={card === 0} onClick={() => { setCard(card-1); setFlipped(false); }}><ChevronLeft size={16} /> Previous</Button><Button variant="outline" disabled={card === pack.flashcards.length-1} onClick={() => { setCard(card+1); setFlipped(false); }}>Next <ChevronRight size={16} /></Button></div></TabsContent>
      <TabsContent value="quiz"><div className="study-section-heading"><h2>Check your understanding</h2><span>{answered} / {pack.quiz.length}</span></div>{pack.quiz.map((q,i) => <fieldset className="quiz-question" key={i}><legend>{i+1}. {q.question}</legend>{q.options.map((option,j) => <button key={j} disabled={answers[i] !== undefined} onClick={() => setAnswers({ ...answers, [i]: j })} className={`quiz-option ${answers[i] !== undefined && j === q.correctIndex ? "correct" : answers[i] === j ? "incorrect" : ""}`}><span>{String.fromCharCode(65+j)}</span>{option}{answers[i] !== undefined && j === q.correctIndex && <small>Correct answer</small>}</button>)}{answers[i] !== undefined && <p className="quiz-feedback" role="status"><strong>{answers[i] === q.correctIndex ? "Correct. " : "Not quite. "}</strong>{q.explanation}</p>}</fieldset>)}{answered === pack.quiz.length && <div className="quiz-score" role="status"><h3>You scored {score} out of {pack.quiz.length}</h3><p>{score === pack.quiz.length ? "Great recall. Try again later to make it stick." : "Review the explanations, then give it another go."}</p><Button variant="outline" onClick={() => setAnswers({})}><RotateCcw size={15} /> Try again</Button></div>}</TabsContent>
    </Tabs><footer className="study-export"><span>Based on your source · Review for accuracy</span><Button variant="outline" size="sm" onClick={download}><Download size={15} /> Download study pack</Button></footer>
  </section>;
}
