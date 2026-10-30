import {test} from 'node:test';
import assert from 'node:assert/strict';
import {jobInput,makeSlug} from '../../lib/validation';
import {sampleJobs} from '../../lib/sample-jobs';
test('job inputs reject unsafe URLs and missing safety confirmations',()=>{const input={...sampleJobs[0],official_confirmed:'on',no_fees:'on'};assert.ok(jobInput.safeParse(input).success);for(const apply_url of ['http://company.com','https://wa.me/123','https://bit.ly/test','https://user:pass@company.com','https://127.0.0.1/x'])assert.equal(jobInput.safeParse({...input,apply_url}).success,false);assert.equal(jobInput.safeParse({...input,no_fees:''}).success,false);});
test('slug is lowercase and includes role, company, city, short id',()=>assert.equal(makeSlug('Accounts Assistant','Acme','Pune','abcd1234-foo'),'accounts-assistant-acme-pune-abcd1234'));
