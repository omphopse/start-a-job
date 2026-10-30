import type { Profile } from '@/lib/auth';
import { addPoster, togglePoster } from '@/app/admin/users/actions';
export function UsersPanel({
  profiles,
  counts,
  preview = false,
}: {
  profiles: Profile[];
  counts: Record<string, number>;
  preview?: boolean;
}) {
  return (
    <>
      <section className="users-add">
        <h2>Add a job poster</h2>
        <p>Approved posters receive a code when they request sign-in. They cannot publish jobs.</p>
        <form action={addPoster}>
          <fieldset disabled={preview}>
            <div className="form-grid">
              <label>
                Full name
                <input name="full_name" required minLength={2} maxLength={100} />
              </label>
              <label>
                Email
                <input name="email" type="email" required maxLength={254} />
              </label>
            </div>
            <button className="button">Create poster account →</button>
          </fieldset>
        </form>
      </section>
      <h2>Your publishing team</h2>
      {profiles.map((p) => (
        <article className="dashboard-job" key={p.id}>
          <div>
            <h3>{p.full_name || 'Team member'}</h3>
            <p>{p.email}</p>
            <span className="tag">
              {p.role} · {p.is_active ? 'Active' : 'Inactive'} · {counts[p.id] || 0} jobs
            </span>
          </div>
          {p.role === 'poster' && (
            <form action={togglePoster}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="active" value={String(!p.is_active)} />
              <button className="button secondary" disabled={preview}>
                {p.is_active ? 'Deactivate' : 'Reactivate'}
              </button>
            </form>
          )}
        </article>
      ))}
    </>
  );
}
