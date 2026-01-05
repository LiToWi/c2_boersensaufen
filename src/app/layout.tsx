import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Manufacturing_Consent, Quantico, Unica_One } from "next/font/google";
import "./globals.css";
import Navbar from '@/components/Navbar'
import BasketTimerBanner from '@/components/BasketTimerBanner'
import Providers from '@/components/Providers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const unica = Unica_One({
  variable: "--font-unica",
  subsets: ["latin"],
  weight: "400"
});

const quantico = Quantico({
  variable: "--font-quantico",
  subsets: ["latin"],
  weight: ["400", "700"]
})

const manufacturing = Manufacturing_Consent({
  variable: "--font-manufacturing",
  subsets: ["latin"],
  weight: ["400"]
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827",
};

export const metadata: Metadata = {
  title: "C2 - Boersensaufen 📈🍺",
  description: "Saufen, Börse, C2",
  applicationName: "c2_boersensaufen",
  authors: [{ name: "Linus Tom Wiggering" }],
  generator: "Next.js",
  keywords: ["Saufen", "Börse", "C2", "Boersensaufen", "Party", "Event"],
  referrer: "origin-when-cross-origin",
  creator: "Studentische Initiative Campusleben Garching e.V.",
  publisher: "Studentische Initiative Campusleben Garching e.V.",
  robots: "index, follow",
  manifest: "/site.webmanifest",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
  ],
  openGraph: {
    title: "C2 - Boersensaufen",
    description: "Saufen, Börse, C2",
    url: "https://c2.tum.de/boersensaufen",
    siteName: "C2 - Boersensaufen",
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "C2 - Boersensaufen",
    description: "Saufen, Börse, C2",
    creator: "@Studentische Initiative Campusleben Garching e.V.",
  },
  category: "event",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${unica.variable} ${quantico.variable} ${manufacturing.variable} antialiased flex flex-col`}>
        <Providers>
          <Navbar />
          <BasketTimerBanner />

          <main className="flex-grow min-h-screen">{children}</main>

          <footer className="w-full py-6 text-center text-sm text-gray-400 mt-auto">
            <p>
              <a href="https://www.c2.tum.de/impressum/" className="underline hover:text-gray-300">Impressum </a>{" "}
              |{" "}
              <a href="https://www.c2.tum.de/datenschutz/" className="underline hover:text-gray-300">Datenschutz </a>
            </p>
            © {new Date().getFullYear()} Studentische Initiative Campusleben Garching e.V. – Campus Cneipe
          </footer>
        </Providers>
      </body>
    </html>
  );
}
