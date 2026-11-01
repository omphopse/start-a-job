import { experienceLevels } from '@/lib/job-options';
import { site } from '@/lib/config';
export function GET() {
  const properties = Object.fromEntries(
    [
      'id',
      'slug',
      'title',
      'company',
      'location',
      'state',
      'work_mode',
      'qualification',
      'experience_level',
      'job_type',
      'category',
      'salary_text',
      'canonical_url',
      'summary',
    ].map((key) => [key, { type: 'string' }]),
  );
  const job = {
    type: 'object',
    required: [
      ...Object.keys(properties),
      'source_apply_url',
      'application_email',
      'last_date',
      'posted_at',
    ],
    properties: {
      ...properties,
      source_apply_url: {
        type: ['string', 'null'],
        format: 'uri',
        description: 'Official HTTPS application URL; null for email applications.',
      },
      application_email: {
        type: ['string', 'null'],
        format: 'email',
        description: 'Public application email; null for URL applications.',
      },
      last_date: { type: ['string', 'null'], format: 'date' },
      posted_at: { type: ['string', 'null'], format: 'date-time' },
    },
    additionalProperties: false,
  };
  const errors = {
    '400': { description: 'Invalid parameters' },
    '429': { description: 'Rate limit exceeded (120 requests per minute)' },
    '503': { description: 'Temporarily unavailable' },
  };
  return Response.json({
    openapi: '3.1.0',
    info: {
      title: `${site.name} public jobs`,
      version: '0.1.0',
      description: `Published, non-expired jobs only. Attribute as Source: ${site.name}. No authentication required.`,
    },
    servers: [{ url: site.url }],
    paths: {
      '/api/public/jobs.json': {
        get: {
          summary: 'List current jobs',
          parameters: [
            ...['q', 'state', 'category', 'experience_level', 'job_type'].map((name) => ({
              in: 'query',
              name,
              schema: {
                type: 'string',
                ...(name === 'experience_level' ? { enum: experienceLevels } : {}),
              },
            })),
            { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
            {
              in: 'query',
              name: 'limit',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: {
            '200': {
              description: 'Current jobs',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['attribution', 'page', 'limit', 'total', 'jobs'],
                    properties: {
                      attribution: { type: 'string' },
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      jobs: { type: 'array', items: { $ref: '#/components/schemas/Job' } },
                    },
                  },
                },
              },
            },
            ...errors,
          },
        },
      },
      '/api/public/jobs/{slug}.json': {
        get: {
          summary: 'Get a current job',
          parameters: [{ in: 'path', name: 'slug', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Current job',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      attribution: { type: 'string' },
                      job: { $ref: '#/components/schemas/Job' },
                    },
                  },
                },
              },
            },
            '404': { description: 'Not found or expired' },
            ...errors,
          },
        },
      },
    },
    components: { schemas: { Job: job } },
  });
}
