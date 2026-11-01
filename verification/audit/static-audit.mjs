import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',maxBuffer:100*1024*1024});
const walk=(dir)=>existsSync(dir)?readdirSync(dir).flatMap(n=>{const p=join(dir,n);return statSync(p).isDirectory()?walk(p):[p]}):[];
const files=[...['app','components','lib','scripts'].flatMap(walk), 'next.config.ts', 'proxy.ts', 'playwright.config.ts'].filter(p=>/\.[cm]?[jt]sx?$/.test(p));
const used=new Set(files.flatMap(p=>[...readFileSync(p,'utf8').matchAll(/process\.env\.([A-Z0-9_]+)/g)].map(m=>m[1])));
const documented=[...readFileSync('.env.example','utf8').matchAll(/^([A-Z0-9_]+)=/gm)].map(m=>m[1]);
const patterns=[['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['jwt',/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/],['provider-token',/(?:sk_live_|ghp_|github_pat_|sb_secret_)[A-Za-z0-9_]{20,}/],['aws-key',/AKIA[A-Z0-9]{16}/]];
const scan=(text,source)=>text.split('\n').flatMap((line,i)=>patterns.filter(([,rx])=>rx.test(line)).map(([type])=>({source,line:i+1,type})));
const workingFiles = git('ls-files','--cached','--others','--exclude-standard').trim().split('\n').filter(p=>p && existsSync(p) && !/\.(png|jpg|jpeg|webp|ico|woff2?|ttf|pdf|zip)$/i.test(p));
const working=workingFiles.flatMap(p=>scan(readFileSync(p,'utf8'),p));
const localEnv=existsSync('.env.local')?readFileSync('.env.local','utf8'):'';
const localSecrets=scan(localEnv,'.env.local (ignored)');
const history=[];
for(const commit of git('rev-list','--all').trim().split('\n')) {
  const patch=git('show','--format=','--no-ext-diff',commit);
  history.push(...scan(patch,`git patch ${commit.slice(0,8)}`));
}
const bundleFiles=walk('.next/static').filter(p=>p.endsWith('.js'));
const secretValues=[...localEnv.matchAll(/^(SUPABASE_SERVICE_ROLE_KEY|GOOGLE_INDEXING_SA_JSON|CRON_SECRET)=(.+)$/gm)].map(m=>({type:m[1],value:m[2].trim().replace(/^['"]|['"]$/g,'')})).filter(x=>x.value.length>15);
const bundle=bundleFiles.flatMap(p=>{const text=readFileSync(p,'utf8');return [...scan(text,p),...secretValues.filter(s=>text.includes(s.value)).map(s=>({source:p,type:s.type+' exact-value'})),...(text.includes('SUPABASE_SERVICE_ROLE_KEY')?[{source:p,type:'service-role variable name'}]:[])];});
const output={used:[...used].sort(),undocumented:[...used].filter(v=>!documented.includes(v)),unused:documented.filter(v=>!used.has(v)),working,localSecrets,history,bundle,bundleFiles:bundleFiles.length,trackedSensitive:git('ls-files').split('\n').filter(p=>/(\.env(?!\.example)|\.pem$|\.key$|service.account.*\.json$)/.test(p))};
const phase=process.env.AUDIT_PHASE || 'phase-a';
writeFileSync(`verification/audit/static-${phase}.json`,JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
