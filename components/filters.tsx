'use client';
import { useState } from 'react';
import { defaultCategories } from '@/lib/job-options';
import Link from 'next/link';
import type { Filters } from '@/lib/data';
import type { LocationFacet } from '@/lib/location-names';

export function FiltersForm({
  filters,
  categories = defaultCategories,
  facets = [],
  remoteCount = 0,
}: {
  filters: Filters;
  categories?: string[];
  facets?: LocationFacet[];
  remoteCount?: number;
}) {
  const countries = [...new Set(facets.map((row) => row.country))].filter(Boolean);
  const defaultCountry = countries.length === 1 ? countries[0] : '';
  const [country, setCountry] = useState(filters.country || defaultCountry);
  const [state, setState] = useState(filters.state || '');
  const [city, setCity] = useState(filters.city || '');
  const [workMode, setWorkMode] = useState(filters.work_mode || '');
  function options(field: 'country' | 'state' | 'city') {
    const counts = new Map<string, number>();
    for (const row of facets) {
      if (field !== 'country' && country && row.country !== country) continue;
      if (field === 'city' && state && row.state !== state) continue;
      if (row[field]) counts.set(row[field], (counts.get(row[field]) || 0) + row.job_count);
    }
    return [...counts].sort(([a], [b]) => a.localeCompare(b));
  }
  function locationSelect(
    field: 'country' | 'state' | 'city',
    value: string,
    disabled: boolean,
    onChange: (value: string) => void,
  ) {
    const label = field[0].toUpperCase() + field.slice(1);
    const choices = options(field);
    return (
      <label>
        {label}
        <select
          name={field}
          aria-label={label}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-busy={false}
        >
          <option value="">
            {disabled
              ? `Select ${field === 'state' ? 'a country' : 'a state'} first`
              : `All ${field === 'country' ? 'countries' : field === 'state' ? 'states' : 'cities'}`}
          </option>
          {value && !choices.some(([name]) => name === value) && (
            <option value={value}>{value} (0)</option>
          )}
          {choices.map(([name, count]) => (
            <option key={name} value={name}>
              {name} ({count})
            </option>
          ))}
        </select>
      </label>
    );
  }
  const choices = {
    job_type: ['full-time', 'part-time', 'internship', 'contract'],
    category: categories,
    work_mode: ['office', 'hybrid', ...(remoteCount || workMode === 'remote' ? ['remote'] : [])],
  };
  const labels = { job_type: 'Job type', category: 'Category', work_mode: 'Work mode' };
  return (
    <form action="/jobs" className="filters-form">
      <input type="hidden" name="q" value={filters.q || ''} />
      {filters.sort && <input type="hidden" name="sort" value={filters.sort} />}
      <div className="filter-heading">
        <h2>Filters</h2>
        <Link href="/jobs">Reset all</Link>
      </div>
      {countries.length === 1 ? (
        <input type="hidden" name="country" value={country || countries[0]} />
      ) : (
        locationSelect('country', country, !countries.length, (value) => {
          setCountry(value);
          setState('');
          setCity('');
        })
      )}
      {locationSelect('state', state, !country && !filters.state, (value) => {
        setState(value);
        setCity('');
      })}
      {locationSelect('city', city, !state && !filters.city, setCity)}
      {(Object.keys(choices) as (keyof typeof choices)[]).map((key) => (
        <label key={key}>
          {labels[key]}
          {key === 'work_mode' ? (
            <select
              name={key}
              value={workMode}
              onChange={(event) => {
                setWorkMode(event.target.value);
                if (event.target.value === 'remote') {
                  setState('');
                  setCity('');
                }
              }}
            >
              <option value="">All work modes</option>
              {choices[key].map((value) => (
                <option key={value} value={value}>
                  {value === 'remote' ? `Remote / anywhere (${remoteCount})` : value}
                </option>
              ))}
            </select>
          ) : (
            <select name={key} defaultValue={filters[key] || ''}>
              <option value="">All {labels[key].toLowerCase()}</option>
              {choices[key].map((value) => (
                <option key={value} value={value}>
                  {value.replace('-', ' ')}
                </option>
              ))}
            </select>
          )}
        </label>
      ))}
      <button className="button" type="submit">
        Apply filters
      </button>
    </form>
  );
}
