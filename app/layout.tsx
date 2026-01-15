import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignalForge - Discover Viral Content Ideas",
  description: "Stop guessing what to post. SignalForge scans Reddit, X, and LinkedIn to find viral content in your niche with explainable virality scores.",
  keywords: ["content discovery", "viral content", "social media", "content marketing", "virality score"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
