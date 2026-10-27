"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, BookOpen, Check, ChevronRight, Clock3, Download, FileAudio, FileText, Folder, FolderOpen, Layers3, MoreHorizontal, Pencil, Plus, Search, Sparkles, Star, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StudyPanel } from "@/components/study-panel";
import { validateUpload, type StudyPack } from "@/lib/study";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { Note } from "@/lib/note";
import { auth, apiFetch } from "@/lib/auth-client";
import { onAuthStateChanged, signOut, sendEmailVerification, type User } from "firebase/auth";
import { AccountGate } from "@/components/account-gate";
import { extractNotes } from "@/lib/extract-notes";



const folders = ["All files", "Physics", "Mathematics", "Computer Science"];
function fileIcon(kind: Note["kind"]) { return kind === "audio" ? <FileAudio /> : kind === "pdf" ? <FileText /> : <BookOpen />; }
function safeName(name: string) { return name.replace(/[\\/:*?\"<>|]/g, " ").trim() || "Untitled note"; }

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [,refreshAccount]=useState(0);
  const [authLoading,setAuthLoading]=useState(true);
  const writes=useRef<Record<string,Promise<void>>>({});
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeFolder, setActiveFolder] = useState("All files");
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [packs, setPacks] = useState<Record<string, StudyPack>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [editorMode, setEditorMode] = useState("study");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => onAuthStateChanged(auth, current => {
    setUser(current);setAuthLoading(false);setNotes([]);setPacks({});setOpenedId(null);setSelected([]);setErrors({});setNotice("");
  }), []);
  useEffect(() => {
    if(!user)return;
    let cancelled=false;
    apiFetch("/api/study").then(r=>r.json() as Promise<{configured:boolean}>).then(d=>{if(!cancelled)setConfigured(d.configured);}).catch(()=>undefined);
    apiFetch("/api/notes").then(async response=>{
      const data=await response.json() as {error?:string;notes:Note[];note:Note};if(!response.ok)throw new Error(data.error||"Could not load notes.");
      if(!cancelled)setNotes(data.notes);
    }).catch(error=>{if(!cancelled)setNotice(error.message);});
    return ()=>{cancelled=true;};
  }, [user]);

  const filteredNotes = useMemo(() => notes.filter((note) => {
    const folderMatch = activeFolder === "All files" || note.folder === activeFolder;
    const tabMatch = activeTab === "all" || (activeTab === "notes" ? note.kind === "note" : note.kind !== "note");
    return folderMatch && tabMatch && note.title.toLowerCase().includes(query.toLowerCase());
  }), [notes, activeFolder, activeTab, query]);
  const opened = notes.find((note) => note.id === openedId) ?? null;

  async function loadPack(id: string) {
    if (packs[id] || id.startsWith("demo-")) return;
    try {
      const response = await apiFetch(`/api/study?id=${encodeURIComponent(id)}`);
      const data = await response.json() as { error?: string; pack?: StudyPack; note: Note };
      if (!response.ok) throw new Error(data.error);
      const pack = data.pack;
      if (pack) setPacks(current => ({ ...current, [id]: pack }));
    } catch { setErrors(current => ({ ...current, [id]: "Could not load saved study materials. Try again." })); }
  }
  async function generate(id: string) {
    if (generating[id]) return;
    setGenerating(current => ({ ...current, [id]: true }));
    setErrors(current => ({ ...current, [id]: "" }));
    try {
      await writes.current[id];
      const response = await apiFetch("/api/study", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, regenerate: Boolean(packs[id]) }) });
      const data = await response.json() as { error?: string; pack?: StudyPack; note: Note };
      if (!response.ok || !data.pack) throw new Error(data.error || "Generation failed. Please retry.");
      const pack = data.pack;
      setPacks(current => ({ ...current, [id]: pack }));
    } catch (error) { setErrors(current => ({ ...current, [id]: error instanceof Error ? error.message : "Generation failed. Please retry." })); }
    finally { setGenerating(current => ({ ...current, [id]: false })); }
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    setNotice("");
    for (const file of list) {
      const validation = validateUpload(file);
      if (validation) { setNotice(`${file.name}: ${validation}`); continue; }

      try {
        const content = await extractNotes(file);
        if(!content.trim())throw new Error("This file contains no readable text.");
        const response = await apiFetch("/api/notes", { method: "POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({title:file.name.replace(/\.[^.]+$/, ""),content,kind:file.name.toLowerCase().endsWith(".pdf")?"pdf":"note",folder:activeFolder==="All files"?"Unsorted":activeFolder,size:`${Math.max(1,Math.round(file.size/1000))} KB`}) });
        const data = await response.json() as { error?: string; pack?: StudyPack; note: Note };
        if (!response.ok) throw new Error(data.error || "Upload failed.");
        setNotes(current => [data.note, ...current.filter(n => !n.id.startsWith("demo-"))]);
        setOpenedId(data.note.id); setEditorMode("study");
        if(user?.emailVerified) await generate(data.note.id);
      } catch (error) { setNotice(`${file.name}: ${error instanceof Error ? error.message : "Upload failed. Please retry."}`); }
    }
    setUploading(false);
  }

  function updateNote(id: string, patch: Partial<Note>) {
    if (patch.content !== undefined) setPacks(current => { const next = { ...current }; delete next[id]; return next; });
    setNotes((current) => current.map((note) => note.id === id ? { ...note, ...patch, updatedAt: "Just now" } : note));
    writes.current[id]=(writes.current[id]||Promise.resolve()).catch(()=>undefined).then(async()=>{
      const response=await apiFetch("/api/notes",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,...patch})});
      if(!response.ok){const data=await response.json() as {error?:string;notes:Note[];note:Note};throw new Error(data.error||"Changes could not be saved.");}
    });
    void writes.current[id].catch(error=>setNotice(error.message));
  }
  async function removeNote(id: string) {
    try{
      await writes.current[id];
      const response=await apiFetch(`/api/notes?id=${encodeURIComponent(id)}`,{method:"DELETE"});
      if(!response.ok)throw new Error("Could not delete note. Please retry.");
      setNotes(current=>current.filter(n=>n.id!==id));setSelected(current=>current.filter(value=>value!==id));if(openedId===id)setOpenedId(null);
    }catch(error){setNotice(error instanceof Error?error.message:"Could not delete note.");}
  }

  function downloadNote(note: Note) {
    const url = URL.createObjectURL(new Blob([note.content], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${safeName(note.title)}.md`; anchor.click(); URL.revokeObjectURL(url);
  }
  async function mergeSelected() {
    const chosen = notes.filter((note) => selected.includes(note.id)); if (chosen.length < 2) return;
    const merged: Note = { id: crypto.randomUUID(), title: `${chosen[0].folder} · Combined notes`, content: chosen.map((note) => `# ${note.title}\n\n${note.content.replace(/^# .*\n+/, "")}`).join("\n\n***\n\n"), kind: "note", folder: chosen[0].folder, size: `${Math.max(1, chosen.length * 8)} KB`, updatedAt: "Just now", starred: false };
    try {
      const response=await apiFetch("/api/notes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(merged)});
      const data=await response.json() as {error?:string;notes:Note[];note:Note};if(!response.ok)throw new Error(data.error);
      setNotes(current=>[data.note,...current]);setSelected([]);setOpenedId(data.note.id);
    } catch(error){setNotice(error instanceof Error?error.message:"Could not save combined note.");}
  }

  if(authLoading)return <main className="account-screen"><p>Loading your account…</p></main>;
  if(!user)return <AccountGate/>;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Sparkles size={17} strokeWidth={2.4} /></span><span>studybuddy</span><span className="brand-ai">ai</span></div>
        <nav className="primary-nav" aria-label="Main navigation">
          <button className="nav-item active"><Layers3 size={17} /> Library</button><button className="nav-item"><Clock3 size={17} /> Recent</button><button className="nav-item"><Star size={17} /> Starred</button><button className="nav-item"><Archive size={17} /> Archive</button>
        </nav>
        <div className="sidebar-rule" />
        <div className="folder-heading"><span>Folders</span><button aria-label="Add folder"><Plus size={15} /></button></div>
        <nav className="folder-list" aria-label="Folders">{folders.map((folder) => <button key={folder} className={`folder-item ${activeFolder === folder ? "selected" : ""}`} onClick={() => setActiveFolder(folder)}>{activeFolder === folder ? <FolderOpen size={17} /> : <Folder size={17} />}<span>{folder}</span>{folder !== "All files" && <span className="folder-count">{notes.filter((note) => note.folder === folder).length}</span>}</button>)}</nav>
        <div className="profile"><div className="avatar">{user.email?.[0]?.toUpperCase()}</div><div><strong>{user.email}</strong><button onClick={()=>signOut(auth)} disabled={uploading||Object.values(generating).some(Boolean)}>Sign out</button></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">Workspace</p><h1>{activeFolder}</h1></div>
          <div className="top-actions">
            <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes" /><kbd>⌘ K</kbd></label>
            <Button className="upload-button" onClick={() => inputRef.current?.click()} disabled={uploading}><UploadCloud size={16} /> {uploading ? "Processing…" : "Upload"}</Button>
            <input ref={inputRef} hidden multiple type="file" accept=".pdf,.txt,.md" onChange={(event) => { if (event.target.files) void uploadFiles(event.target.files); event.target.value = ""; }} />
          </div>
        </header>
        <div className="content">
          {!user.emailVerified && <div className="connection-notice"><div><strong>Verify your email to generate study materials</strong><span>You can already save notes. Check your inbox, then confirm below.</span><Button size="sm" onClick={async()=>{try{await user.reload();await user.getIdToken(true);setUser(auth.currentUser);refreshAccount(value=>value+1);if(!auth.currentUser?.emailVerified)setNotice("Email is not verified yet.");}catch{setNotice("Could not refresh your account.");}}}>I verified my email</Button><Button variant="ghost" size="sm" onClick={()=>sendEmailVerification(user).then(()=>setNotice("Verification email sent.")).catch(()=>setNotice("Could not send email. Try again later."))}>Resend email</Button></div></div>}
          {configured === false && <div className="connection-notice" role="status"><Sparkles size={18} /><div><strong>AI connection needed</strong><span>You can upload and save notes. Generation will be available once the workspace owner connects AI.</span></div></div>}
          {notice && <p className="error-message" role="alert">{notice}</p>}
          <section role="button" tabIndex={0} aria-label="Upload study material" onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }} className={`drop-zone ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); uploadFiles(event.dataTransfer.files); }} onClick={() => inputRef.current?.click()}>
            <span className="drop-icon"><UploadCloud size={22} /></span><div><strong>Upload notes. Start studying.</strong><span>Text PDF, Markdown or text · originals are not stored</span></div><ChevronRight className="drop-arrow" size={19} />
          </section>
          <div className="library-head"><Tabs value={activeTab} onValueChange={setActiveTab}><TabsList variant="line" className="library-tabs"><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="notes">Notes</TabsTrigger><TabsTrigger value="sources">Source files</TabsTrigger></TabsList></Tabs><span className="item-count">{filteredNotes.length} items</span></div>
          {selected.length > 0 && <div className="selection-bar"><span><Check size={15} /> {selected.length} selected</span><Button size="sm" onClick={mergeSelected} disabled={selected.length < 2}><Layers3 size={15} /> Combine into one note</Button><button onClick={() => setSelected([])} aria-label="Clear selection"><X size={17} /></button></div>}
          <div className="file-table" role="table" aria-label="Study notes">
            <div className="file-row file-header" role="row"><span>Name</span><span>Folder</span><span>Updated</span><span>Size</span><span /></div>
            {filteredNotes.map((note) => {
              const isSelected = selected.includes(note.id);
              return <div key={note.id} className={`file-row ${isSelected ? "row-selected" : ""}`} role="row" onDoubleClick={() => setOpenedId(note.id)}>
                <div className="file-name"><button className={`select-box ${isSelected ? "checked" : ""}`} onClick={() => setSelected((current) => current.includes(note.id) ? current.filter((id) => id !== note.id) : [...current, note.id])} aria-label={`Select ${note.title}`}>{isSelected && <Check size={13} />}</button><span className={`type-icon ${note.kind}`}>{fileIcon(note.kind)}</span><button className="title-button" onClick={() => setOpenedId(note.id)}><strong>{note.title}</strong><span>{generating[note.id] ? "Generating study materials…" : packs[note.id] ? "Study materials ready" : note.kind === "note" ? "Study note" : note.kind === "pdf" ? "PDF document" : "Audio recording"}</span></button></div>
                <span className="cell-muted"><Folder size={14} /> {note.folder}</span><span className="cell-muted">{note.updatedAt}</span><span className="cell-muted">{note.size}</span>
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${note.title}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="dark-menu"><DropdownMenuItem onClick={() => setOpenedId(note.id)}><Pencil /> Open and edit</DropdownMenuItem><DropdownMenuItem onClick={() => downloadNote(note)}><Download /> Export to Finder</DropdownMenuItem><DropdownMenuItem onClick={() => updateNote(note.id, { starred: !note.starred })}><Star /> {note.starred ? "Remove star" : "Add to starred"}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => removeNote(note.id)}><Trash2 /> Move to trash</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
              </div>;
            })}
          </div>
          {filteredNotes.length === 0 && <div className="empty-state"><FileText size={28} /><strong>No notes here yet</strong><span>Upload a file or choose another folder.</span></div>}
        </div>
      </section>

      {opened && <aside className="editor-panel">
        <div className="editor-top"><div className={`type-icon ${opened.kind}`}>{fileIcon(opened.kind)}</div><span>{opened.kind === "note" ? "Study note" : "Generated note"}</span><Button variant="ghost" size="icon-sm" onClick={() => setOpenedId(null)} aria-label="Close editor"><X /></Button></div>
        <input className="title-editor" value={opened.title} onChange={(event) => updateNote(opened.id, { title: event.target.value })} aria-label="Note title" />
        <div className="editor-meta"><span><Folder size={14} /> {opened.folder}</span><span>Source note</span></div>
        <Tabs value={editorMode} onValueChange={setEditorMode} className="editor-mode"><TabsList><TabsTrigger value="study">Study materials</TabsTrigger><TabsTrigger value="source">Original note</TabsTrigger></TabsList></Tabs>
        {editorMode === "study" ? <StudyPanel key={opened.id} id={opened.id} title={opened.title} pack={packs[opened.id]} busy={!!generating[opened.id]} error={errors[opened.id]} generate={() => generate(opened.id)} load={() => loadPack(opened.id)} /> : <><textarea className="content-editor" value={opened.content} onChange={(event) => updateNote(opened.id, { content: event.target.value })} aria-label="Note content" />
        <div className="editor-footer"><span><Check size={14} /> Source editor</span><Button variant="outline" size="sm" onClick={() => downloadNote(opened)}><Download size={15} /> Export .md</Button></div></>}
      </aside>}
    </main>
  );
}
