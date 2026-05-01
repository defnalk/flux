import type { Metadata } from "next";
import { Suspense } from "react";

import { Conversation } from "@/components/chat/conversation";
import { Footer } from "@/components/landing/footer";
import { Nav } from "@/components/landing/nav";

export const metadata: Metadata = {
  title: "Chat — Flux",
  description: "Streamed answer with charts and sources.",
};

type Search = Promise<{ q?: string | string[] }>;

function pickQuestion(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ChatPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const question = pickQuestion(params.q).trim() ||
    "How did Germany's coal share change between 2015 and 2024?";

  return (
    <div className="relative flex min-h-screen flex-col">
      <Nav />
      <Suspense fallback={null}>
        <Conversation initialQuestion={question} />
      </Suspense>
      <Footer />
    </div>
  );
}
