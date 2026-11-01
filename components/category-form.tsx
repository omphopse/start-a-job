'use client';
import { useActionState, useState } from 'react';
import { addCategory } from '@/app/admin/jobs/category-actions';
export function CategoryForm({ preview = false }: { preview?: boolean }) {
  const [state, action, pending] = useActionState(addCategory, { message: '' });
  const [name, setName] = useState('');
  return (
    <details className="form-message">
      <summary>Add a new category</summary>
      <form action={action} className="login-form">
        <label>
          New category name
          <input
            name="category_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={80}
            required
            disabled={preview || pending}
          />
        </label>
        <button className="button secondary" disabled={preview || pending}>
          Add category
        </button>
        {state.message && <p role="status">{state.message}</p>}
      </form>
    </details>
  );
}
