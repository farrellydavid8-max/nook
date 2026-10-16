import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Instrument_Sans } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import TabBar from "@/components/TabBar";
import { Analytics } from "@vercel/analytics/next";
import { EARLY_THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const display = DM_Serif_Display({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Nook",
  description: "Log, review and share everything you watch, play and read.",
};

export const viewport: Viewport = {
  themeColor: "#0F0F10",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: EARLY_THEME_SCRIPT }} />
        <StoreProvider>
          <div className="app">
            <main className="screen-wrap">{children}</main>
            <TabBar />
          </div>
        </StoreProvider>
        <Analytics />
      </body>
    </html>
  );
}
