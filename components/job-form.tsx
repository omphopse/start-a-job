'use client';
import { defaultCategories, experienceLevels } from '@/lib/job-options';
import { useActionState, useState } from 'react';
import type { Job } from '@/lib/jobs';
import { saveJob } from '@/app/admin/jobs/actions';
import { LocationFields } from './location-fields';
export function JobForm({
  job,
  admin = false,
  preview = false,
  categories = defaultCategories,
}: {
  job?: Job;
  admin?: boolean;
  preview?: boolean;
  categories?: string[];
}) {
  const [state, action, pending] = useActionState(saveJob, { message: '' });
  const fields = [
    ['title', 'Job title'],
    ['company_name', 'Company name'],
    ['qualification', 'Qualification'],
    ['salary_text', 'Salary (or Not disclosed)'],
    ['vacancies', 'Vacancies (optional)'],
    ['last_date', 'Last date (optional)'],
    ['application', 'Application URL or Email'],
  ];
  const selects = {
    work_mode: ['office', 'hybrid', 'remote'],
    experience_level: experienceLevels,
    category: [...new Set([...categories, ...(job?.category ? [job.category] : [])])],
    job_type: ['full-time', 'part-time', 'internship', 'contract'],
  };
  const [values, setValues] = useState<Record<string, string>>(() => ({
    country: job?.country || 'India',
    state: job?.state || '',
    location: job?.location || '',
    ...Object.fromEntries(
      fields.map(([name]) => [
        name,
        name === 'application'
          ? job?.application_email || job?.apply_url || ''
          : String(job?.[name as keyof Job] ?? (name === 'salary_text' ? 'Not disclosed' : '')),
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
          <LocationFields
            country={values.country}
            state={values.state}
            city={values.location}
            onChange={(location) => setValues((current) => ({ ...current, ...location }))}
          />
          {fields.map(([name, label]) => (
            <label key={name}>
              {label}
              <input
                name={name}
                type={name === 'last_date' ? 'date' : name === 'vacancies' ? 'number' : 'text'}
                placeholder={
                  name === 'application'
                    ? 'https://company.com/careers/job-123 or hr@company.com'
                    : undefined
                }
                maxLength={name === 'application' ? 2000 : undefined}
                aria-describedby={name === 'application' ? 'application-help' : undefined}
                value={values[name]}
                onChange={(event) => update(name, event.target.value)}
                required={!['last_date', 'vacancies'].includes(name)}
                min={name === 'vacancies' ? 1 : undefined}
              />
              {name === 'application' && (
                <small id="application-help">
                  Enter one official HTTPS URL or one email address.
                </small>
              )}
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
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {[
          ['summary', 'Summary / full details'],
          ['eligibility', 'Eligibility'],
          ['documents_needed', 'Documents needed'],
          ['how_to_apply', 'How to apply'],
        ].map(([name, label]) => (
          <label key={name}>
            {label} <small>{name === 'summary' ? '(minimum 50 characters)' : '(optional)'}</small>
            <textarea
              name={name}
              value={values[name]}
              onChange={(event) => update(name, event.target.value)}
              rows={name === 'summary' ? 7 : 4}
              required={name === 'summary'}
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
          I have checked that the URL or email belongs to the official company or government
          application source.
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
