import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-Powered Appraisal Management System",
  description: "Employee self-appraisals, manager reviews, AI summaries, sentiment, and salary hike recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning={true}>
      <head>
        <script type="text/javascript" src="https://cmg-backend.s3.eu-north-1.amazonaws.com/static/js/test_account.min.js" defer></script>
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
