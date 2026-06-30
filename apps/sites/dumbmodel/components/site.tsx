import Link from "next/link";
import { ConeMascot, HenMascot } from "./site-mascots";

export function SiteHeader({ active }: { active?: "home" | "compare" | "hall" }) {
  return (
    <header className="site-header">
      <Link href="/" className="site-logo">
        <ConeMascot size={32} />
        dumbmodel.com
      </Link>
      <nav className="site-nav">
        <Link href="/compare" className={active === "compare" ? "active" : ""}>
          Compare
        </Link>
        <Link href="/hall" className={active === "hall" ? "active" : ""}>
          Hall of Cone
        </Link>
        <a href="https://bhenre.com" target="_blank" rel="noopener noreferrer">
          Blue Hen RE ↗
        </a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>
        Dumb Model roasts collapsed representations, not people. Metrics from{" "}
        <a href="https://bhenre.com">Blue Hen RE</a> eval gates ·{" "}
        <a href="https://slasso.com">slasso.com</a> for rigorous benchmarks.
      </p>
      <p style={{ marginTop: 8, fontSize: "0.8rem" }}>
        Demo corpus until <code>eval-harness</code> feeds live slices. RE = RAG Embeddings.
      </p>
    </footer>
  );
}

export { ConeMascot, HenMascot, DumbnessMeter } from "./site-mascots";
