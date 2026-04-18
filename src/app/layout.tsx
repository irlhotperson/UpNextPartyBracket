import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
});

export const metadata: Metadata = {
  title: "UpNext | Party Bracket",
  description:
    "Turn your house party into a tournament. QR to join, live brackets on the TV.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "UpNext: Party Bracket",
    description:
      "Turn your house party into a tournament. QR to join, live brackets on the TV.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "UpNext: Party Bracket — UP NEXT in arcade yellow on dark background",
      },
    ],
    type: "website",
    siteName: "UpNext",
  },
  twitter: {
    card: "summary_large_image",
    title: "UpNext: Party Bracket",
    description:
      "Turn your house party into a tournament. QR to join, live brackets on the TV.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#060810",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pressStart.variable} ${vt323.variable} dark h-full`}
    >
      <body className="min-h-full flex flex-col bg-arcade-dark text-foreground">
        {children}
        <div className="scanlines" aria-hidden="true" />
      </body>
    </html>
  );
}
