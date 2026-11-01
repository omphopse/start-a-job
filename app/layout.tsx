import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { site } from '@/lib/config';
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  applicationName: site.name,
  openGraph: { siteName: site.name },
  title: { default: `${site.name} — ${site.tagline}`, template: `%s | ${site.name}` },
  description:
    'Discover desk and office jobs for freshers across India. Read the details and apply directly on the official website.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container nav">
            <Link className="brand" href="/">
              <span className="brand-icon" aria-hidden="true">
                {site.mark}
              </span>
              {site.name}
              <span className="brand-dot">↗</span>
            </Link>
            <nav aria-label="Main navigation">
              <Link href="/jobs">Find a job</Link>
              <Link href="/about">About us</Link>
              <Link href="/admin">
                For job posters <span>↗</span>
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer>
          <div className="container footer-grid">
            <div>
              <Link href="/" className="brand">
                {site.name} ↗
              </Link>
              <p>
                {site.footerTagline}
                <br />
                {site.footerDescription}
              </p>
            </div>
            <div>
              <strong>Explore</strong>
              <Link href="/jobs">Browse jobs</Link>
              <Link href="/about">About {site.name}</Link>
              <Link href="/contact">Contact us</Link>
            </div>
            <div>
              <strong>The important stuff</strong>
              <Link href="/privacy-policy">Privacy policy</Link>
              <Link href="/disclaimer">Disclaimer</Link>
              <Link href="/admin/login">Poster sign in</Link>
            </div>
          </div>
          <div className="container footer-bottom">
            © {new Date().getFullYear()} {site.name} · {site.footerCredit}
            <span>Always free for job seekers.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
