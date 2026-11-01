'use client';

import { useEffect, useState } from 'react';

function LocationSelect({
  name,
  label,
  value,
  query,
  onChange,
  required = false,
}: {
  name: string;
  label: string;
  value: string;
  query: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [result, setResult] = useState<{ options: string[]; loading: boolean; error: boolean }>({
    options: [],
    loading: true,
    error: false,
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/locations?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Locations unavailable');
        const data = await response.json();
        if (
          !Array.isArray(data.options) ||
          !data.options.every((item: unknown) => typeof item === 'string')
        )
          throw new Error('Invalid locations');
        setResult({ options: data.options, loading: false, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ options: [], loading: false, error: true });
      });
    return () => controller.abort();
  }, [query, attempt]);
  const options = [...new Set([...(value ? [value] : []), ...result.options])];
  return (
    <div>
      <label>
        {label}
        {!required && ' (optional)'}
        <select
          name={name}
          value={value}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          aria-busy={result.loading}
          aria-describedby={`${name}-status`}
        >
          <option value="">{required ? `Select ${label.toLowerCase()}` : 'Not specified'}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <small id={`${name}-status`} role="status">
        {result.loading
          ? `Loading ${label.toLowerCase()} options…`
          : result.error
            ? 'Locations unavailable. Your current selection is preserved.'
            : result.options.length === 0
              ? 'No options available. You can leave this blank.'
              : ''}
      </small>
      {result.error && (
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setResult({ options: [], loading: true, error: false });
            setAttempt((current) => current + 1);
          }}
        >
          Retry {label.toLowerCase()}
        </button>
      )}
    </div>
  );
}

export function LocationFields({
  country,
  state,
  city,
  onChange,
}: {
  country: string;
  state: string;
  city: string;
  onChange: (values: { country: string; state: string; location: string }) => void;
}) {
  const query = new URLSearchParams({ country });
  const cityQuery = new URLSearchParams({ kind: 'cities', country, ...(state ? { state } : {}) });
  return (
    <>
      <LocationSelect
        name="country"
        label="Country"
        value={country}
        query="kind=countries"
        required
        onChange={(value) => onChange({ country: value, state: '', location: '' })}
      />
      {country ? (
        <>
          <LocationSelect
            key={`state-${country}`}
            name="state"
            label="State"
            value={state}
            query={`kind=states&${query}`}
            onChange={(value) => onChange({ country, state: value, location: '' })}
          />
          <LocationSelect
            key={`city-${country}-${state}`}
            name="location"
            label="City"
            value={city}
            query={cityQuery.toString()}
            onChange={(value) => onChange({ country, state, location: value })}
          />
        </>
      ) : (
        <>
          <label>
            State (optional)
            <select name="state" value="" disabled>
              <option value="">Select a country first</option>
            </select>
          </label>
          <label>
            City (optional)
            <select name="location" value="" disabled>
              <option value="">Select a country first</option>
            </select>
          </label>
        </>
      )}
    </>
  );
}
