'use client';
import { useActionState, useState } from 'react';
import type { Job } from '@/lib/jobs';
import { saveJob } from '@/app/admin/jobs/actions';
export function JobForm({
  job,
  admin = false,
  preview = false,
}: {
  job?: Job;
  admin?: boolean;
  preview?: boolean;
}) {
  const [state, action, pending] = useActionState(saveJob, { message: '' });
  const fields = [
    ['title', 'Job title'],
    ['company_name', 'Company name'],
    ['location', 'City / location'],
    ['state', 'State'],
    ['qualification', 'Qualification'],
    ['salary_text', 'Salary (or Not disclosed)'],
    ['vacancies', 'Vacancies'],
    ['last_date', 'Last date'],
    ['apply_url', 'Official HTTPS application URL'],
  ];
  const selects = {
    work_mode: ['office', 'hybrid', 'remote'],
    experience_level: ['fresher', '0-1', '1-3'],
    category: ['Data entry', 'Customer support', 'Accounts', 'HR', 'Administration', 'Government'],
    job_type: ['full-time', 'part-time', 'internship', 'contract'],
  };
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(
      fields.map(([name]) => [
        name,
        String(job?.[name as keyof Job] ?? (name === 'salary_text' ? 'Not disclosed' : '')),
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(selects).map(([name, options]) => [
        name,
        String(job?.[name as keyof Job] || options[0]),
      ]),
    ),
    ...Object.fromEntries(
      ['summary', 'eligibility', 'documents_needed', 'how_to_apply'].map((name) => [
        name,
        String(job?.[name as keyof Job] || ''),
      ]),
    ),
    notice: '',
    official_confirmed: '',
    no_fees: '',
  }));
  const update = (name: string, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));
  return (
    <form action={action} className="job-form" onReset={(event) => event.preventDefault()}>
      <input type="hidden" name="id" value={job?.id || ''} />
      <fieldset disabled={preview || pending}>
        <legend>Opportunity details</legend>
        <div className="form-grid">
          {fields.map(([name, label]) => (
            <label key={name}>
              {label}
              <input
                name={name}
                type={
                  name === 'last_date'
                    ? 'date'
                    : name === 'vacancies'
                      ? 'number'
                      : name === 'apply_url'
                        ? 'url'
                        : 'text'
                }
                value={values[name]}
                onChange={(event) => update(name, event.target.value)}
                required={!['last_date', 'vacancies'].includes(name)}
                min={name === 'vacancies' ? 1 : undefined}
              />
            </label>
          ))}
          {Object.entries(selects).map(([name, options]) => (
            <label key={name}>
              {name.replaceAll('_', ' ')}
              <select
                name={name}
                value={values[name]}
                onChange={(event) => update(name, event.target.value)}
              >
                {options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="notice-helper">
          <label>
            Paste notice → fill form
            <textarea
              value={values.notice}
              onChange={(event) => update('notice', event.target.value)}
              placeholder="Paste an official notice here for reference. Fill the fields below manually for now."
              rows={5}
            />
          </label>
          <button type="button" disabled className="button secondary">
            Generate summary with AI · coming soon
          </button>
        </div>
        {[
          ['summary', 'Summary / full details'],
          ['eligibility', 'Eligibility'],
          ['documents_needed', 'Documents needed'],
          ['how_to_apply', 'How to apply'],
        ].map(([name, label]) => (
          <label key={name}>
            {label}{' '}
            <small>
              (minimum{' '}
              {
                (
                  {
                    summary: 50,
                    eligibility: 20,
                    documents_needed: 10,
                    how_to_apply: 20,
                  } as Record<string, number>
                )[name]
              }{' '}
              characters)
            </small>
            <textarea
              name={name}
              value={values[name]}
              onChange={(event) => update(name, event.target.value)}
              rows={name === 'summary' ? 7 : 4}
              required
            />
          </label>
        ))}
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="official_confirmed"
            checked={values.official_confirmed === 'on'}
            onChange={(event) => update('official_confirmed', event.target.checked ? 'on' : '')}
            required
          />
          I have checked that the URL belongs to the official company or government application
          source.
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="no_fees"
            checked={values.no_fees === 'on'}
            onChange={(event) => update('no_fees', event.target.checked ? 'on' : '')}
            required
          />
          This job does not ask candidates to pay recruitment or application fees.
        </label>
        <div className="form-actions">
          <button name="intent" value="draft" className="button secondary">
            Save draft
          </button>
          <button name="intent" value="pending" className="button">
            Submit for approval →
          </button>
          {admin && (
            <button name="intent" value="published" className="button">
              Publish →
            </button>
          )}
        </div>
      </fieldset>
      {state.message && (
        <p role="alert" className="form-message">
          {state.message}
        </p>
      )}
    </form>
  );
}
