import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="container section">
      <p className="eyebrow">404 · LET’S FIND YOUR WAY</p>
      <h1>A fresh start is this way.</h1>
      <p>We couldn’t find that page. Your next opportunity could still be waiting.</p>
      <Link className="button" href="/jobs">
        Browse current jobs →
      </Link>
    </div>
  );
}
