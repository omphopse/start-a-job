import 'server-only';
import {createHash} from 'node:crypto';
import {serviceDb} from './supabase/server';
import {configured} from './config';
const buckets=new Map<string,{hits:number;end:number}>();
export async function rateLimit(scope:string,identity:string,limit:number,seconds:number){const key=createHash('sha256').update(`${scope}:${identity}`).digest('hex');if(configured){const {data,error}=await serviceDb().rpc('take_rate_limit',{p_key:key,p_limit:limit,p_seconds:seconds});if(error)throw new Error('Rate limiter unavailable');return data===true;}const now=Date.now();if(buckets.size>10000)for(const [k,b] of buckets)if(b.end<now)buckets.delete(k);const old=buckets.get(key);const b=old&&old.end>now?old:{hits:0,end:now+seconds*1000};b.hits++;buckets.set(key,b);return b.hits<=limit;}
export function requestIdentity(headers:Headers){return headers.get('x-nf-client-connection-ip')||headers.get('cf-connecting-ip')||'local';}
