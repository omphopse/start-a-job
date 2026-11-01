import { ApplyPanel } from './apply-panel';
import { getApplicationMethod } from '@/lib/application-method';
import { EmailApplyPanel } from './email-apply-panel';
import type { PublicJob } from '@/lib/public-job-fields';

export function ApplicationPanel({
  job,
  delay,
}: {
  job: Pick<PublicJob, 'id' | 'title' | 'company_name' | 'apply_url' | 'application_email'>;
  delay: number;
}) {
  const method = getApplicationMethod(job);
  if (method?.kind === 'url') return <ApplyPanel url={method.url} jobId={job.id} delay={delay} />;
  if (method?.kind !== 'email')
    return (
      <section className="apply-panel">
        <div>
          <h2>Applications unavailable</h2>
          <p>This listing does not have a valid application URL or email address.</p>
        </div>
      </section>
    );
  return (
    <EmailApplyPanel
      key={job.id}
      jobId={job.id}
      email={method.email}
      title={job.title}
      company={job.company_name}
      delay={delay}
    />
  );
}
