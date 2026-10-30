import {test} from 'node:test';
import assert from 'node:assert/strict';
import {notify} from '../../lib/seo/notify';
import {site} from '../../lib/config';
test('SEO notifications do nothing without configuration and tolerate failure',async()=>{const key=process.env.INDEXNOW_KEY,google=process.env.GOOGLE_INDEXING_SA_JSON;delete process.env.INDEXNOW_KEY;delete process.env.GOOGLE_INDEXING_SA_JSON;let calls=0;const mocked=async()=>{calls++;return new Response('',{status:500});};await notify(`${site.url}/jobs/test`,'URL_UPDATED',mocked);assert.equal(calls,0);process.env.INDEXNOW_KEY='test-public-indexnow-key';const error=console.error;console.error=()=>{};try{await notify(`${site.url}/jobs/test`,'URL_DELETED',mocked);assert.equal(calls,1);}finally{console.error=error;if(key)process.env.INDEXNOW_KEY=key;else delete process.env.INDEXNOW_KEY;if(google)process.env.GOOGLE_INDEXING_SA_JSON=google;}});
