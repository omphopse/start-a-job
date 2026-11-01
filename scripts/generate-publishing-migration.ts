import { writeFileSync } from 'node:fs';
import { publishingMigration } from '../lib/publishing-rules';
writeFileSync('supabase/migrations/202611010009_published_required.sql', publishingMigration());
