import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · CUSTOM ME dashboard" },
  robots: { index: false, follow: false },
  // Added to a phone's home screen, the dashboard opens like an app and can get order notifications
  manifest: "/dashboard.webmanifest",
  appleWebApp: { capable: true, title: "CUSTOM ME", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#14215A" };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-dvh bg-paper text-ink">{children}</div>;
}
