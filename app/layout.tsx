import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import RouteLoader from "@/components/RouteLoader";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "gAIa",
  description:
    "gAIa reads how land changes. Ask about a place, compare the years, and see what the trend asks you to do next.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="font-sans antialiased">
        <RouteLoader />
        <SmoothScroll />
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-lime focus:px-4 focus:py-2 focus:text-[#071018]"
        >
          Skip to content
        </a>
        <Nav />
        <div id="content">{children}</div>
      </body>
    </html>
  );
}
