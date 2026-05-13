"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteNav() {
  const pathname = usePathname() || "/";
  const onLanding = pathname === "/";
  const onQuiz = pathname.startsWith("/quiz");

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand" aria-label="GenLayer Incident Response Playbook home">
          <span className="brand-mark" aria-hidden="true"></span>
          <span className="brand-name">
            <span>GenLayer</span>
            <span className="slash">/</span>
            <span className="sub">Incident Response Playbook</span>
          </span>
        </Link>
        <nav className="nav-links">
          <Link href="/#modules" className={onLanding ? "active" : ""}>
            Modules
          </Link>
          <Link href="/quiz" className={onQuiz ? "active" : ""}>
            Quiz
          </Link>
          <Link href="/#network">Network</Link>
          <a
            href="https://github.com/0x03sol/GenLayer-Incident-Response-Playbook"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Source repository on GitHub"
          >
            Source ↗
          </a>
          <a
            href="https://medium.com/@nabilkoman28/genlayer-incident-response-playbook-engineering-journey-dcd62c1e646e"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Engineering journey writeup on Medium"
          >
            Writeup ↗
          </a>
          <a
            href="https://x.com/CijazZamo96896"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Author on X (Twitter)"
          >
            X ↗
          </a>
        </nav>
        <div className="nav-meta">Bradbury · chain 4221</div>
      </div>
    </header>
  );
}
