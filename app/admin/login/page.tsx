import { LoginForm } from '@/components/login-form';
import { site } from '@/lib/config';
export const metadata = { title: 'Poster sign in', robots: { index: false, follow: false } };
export default function Login() {
  return (
    <div className="container auth-page">
      <section className="auth-story">
        <p className="eyebrow">GOOD OPPORTUNITIES START WITH YOU.</p>
        <h1>
          Open a door.
          <br />
          <em>Make a difference.</em>
        </h1>
        <p>
          Help fresh talent find their first step. Share clear, trustworthy opportunities with the
          {site.name} community.
        </p>
        <div className="auth-promise">
          ♧ Every submission is reviewed.
          <br />✓ Every application stays on the official site.
        </div>
      </section>
      <section className="auth-card">
        <span className="auth-icon">↗</span>
        <h2>Welcome back.</h2>
        <p>Sign in with a code sent to your email.</p>
        <LoginForm />
      </section>
    </div>
  );
}
