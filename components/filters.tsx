import Link from 'next/link';
import type { Filters } from '@/lib/data';
const options = {
  state: [
    'Karnataka',
    'Maharashtra',
    'Telangana',
    'Tamil Nadu',
    'Uttar Pradesh',
    'Delhi',
    'Gujarat',
    'West Bengal',
    'Rajasthan',
  ],
  qualification: ['Any graduate', '12th pass', '10th pass', 'Diploma', 'B.Com', 'B.Tech'],
  experience_level: ['fresher', '0-1', '1-3'],
  job_type: ['full-time', 'part-time', 'internship', 'contract'],
  category: ['Data entry', 'Customer support', 'Accounts', 'HR', 'Administration', 'Government'],
  work_mode: ['office', 'hybrid', 'remote'],
};
const labels = {
  state: 'Location / state',
  qualification: 'Qualification',
  experience_level: 'Experience level',
  job_type: 'Job type',
  category: 'Category',
  work_mode: 'Work mode',
};
export function FiltersForm({ filters }: { filters: Filters }) {
  return (
    <form action="/jobs" className="filters-form">
      <input type="hidden" name="q" value={filters.q || ''} />
      <div className="filter-heading">
        <h2>Filters</h2>
        <Link href="/jobs">Reset all</Link>
      </div>
      {(Object.keys(options) as (keyof typeof options)[]).map((key) => (
        <label key={key}>
          {labels[key]}
          <select name={key} defaultValue={filters[key] || ''}>
            <option value="">All {labels[key].toLowerCase()}</option>
            {options[key].map((o) => (
              <option key={o} value={o}>
                {o === 'fresher' ? 'Fresher' : o.replace('-', ' ')}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button className="button" type="submit">
        Apply filters
      </button>
    </form>
  );
}
