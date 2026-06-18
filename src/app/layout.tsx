import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "PathCoder - AI-Powered Coding Challenges",
  description: "Generate personalized coding projects, tasks, and quizzes based on your learning journey. Master programming with real-world challenges tailored to your skill level.",
  keywords: ["coding challenges", "programming projects", "AI-powered learning", "coding practice", "developer skills"],
  authors: [{ name: "PathCoder Team" }],
  creator: "PathCoder",
  publisher: "PathCoder",
  metadataBase: new URL("https://pathcoder.dev"),
  openGraph: {
    title: "PathCoder - AI-Powered Coding Challenges",
    description: "Generate personalized coding projects, tasks, and quizzes based on your learning journey.",
    url: "https://pathcoder.dev",
    siteName: "PathCoder",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PathCoder - AI-Powered Coding Challenges",
    description: "Generate personalized coding projects, tasks, and quizzes based on your learning journey.",
    creator: "@pathcoder",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
