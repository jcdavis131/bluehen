import type { Metadata } from "next";

/** Internal BD promotion pipeline view — reachable by direct link but kept
 * out of search indexes and site navigation (Spec 0020, UX-104). */
export const metadata: Metadata = {
  title: "Validation Queue", // root layout template appends "— Validation Lab · Blue Hen RE"
  robots: { index: false, follow: false },
};

export default function QueueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
