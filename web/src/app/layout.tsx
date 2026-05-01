import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flux — Talk to the grid",
  description:
    "Flux turns plain English questions about the EU power mix and emissions into live charts and policy explainers, grounded in EMBER and EU ETS data.",
  metadataBase: new URL("https://flux.defnalk.dev"),
  openGraph: {
    title: "Flux — Talk to the grid",
    description:
      "Plain English, in. Live charts and policy explainers about European power, out.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flux — Talk to the grid",
    description:
      "Plain English, in. Live charts and policy explainers about European power, out.",
  },
};

export const viewport: Viewport = {
  themeColor: "#06080d",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
