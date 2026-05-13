export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          Incident Response Playbook · GenLayer Bradbury testnet · 8 modules / 16 deployed contracts
        </div>
        <nav className="footer-links" aria-label="External links">
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
        <div className="mono">v2026.05.13 · all tx ACCEPTED · FINISHED_WITH_*</div>
      </div>
    </footer>
  );
}
