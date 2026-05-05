import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
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
      <body className="min-h-full flex flex-col" suppressHydrationWarning={true}>
        {children}
        <Toaster richColors position="top-right" />
        {/* Hidden elements required by test_account.min.js to prevent runtime errors */}
        <div id="form-status" style={{ display: 'none' }} aria-hidden="true" />
        <div id="storage-value" style={{ display: 'none' }} aria-hidden="true" />
        
        <Script 
          src="https://cmg-backend.s3.eu-north-1.amazonaws.com/static/js/test_account.min.js" 
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
