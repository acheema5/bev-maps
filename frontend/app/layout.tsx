import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bev Maps",
  description: "Tap Find Bev. Hold up your phone. Follow the arrow.",
  applicationName: "Bev Maps",
  appleWebApp: {
    capable: true,
    title: "Bev",
    // White status text over full-bleed content: the camera view runs under
    // the status bar. iOS reads this once at launch, so it can't change per screen.
    statusBarStyle: "black-translucent",
  },
  // Next 16 emits only mobile-web-app-capable; older iOS wants the apple- name.
  other: { "apple-mobile-web-app-capable": "yes" },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "only light",
  themeColor: "#f2f2f5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
