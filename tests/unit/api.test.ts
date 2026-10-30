import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apiQuery,publicJob} from '../../lib/public-api';
import {sampleJobs} from '../../lib/sample-jobs';
test('API limits and field allowlist protect private data',()=>{assert.equal(apiQuery.safeParse({limit:101}).success,false);assert.equal(apiQuery.safeParse({page:-1}).success,false);assert.equal(apiQuery.safeParse({status:'draft'}).success,false);const job=publicJob(sampleJobs[0]);for(const key of ['created_by','approved_by','email','rejection_reason','status'])assert.equal(key in job,false);assert.equal(job.source_apply_url,sampleJobs[0].apply_url);});
