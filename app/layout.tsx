import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "StudyBuddy AI · Your study workspace", description: "Turn lectures and documents into clear, editable study notes.", other: { "codex-preview": "development" }, icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className="dark"><body>{children}</body></html>; }
