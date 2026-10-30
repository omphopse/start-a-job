import 'server-only';
import {cookies} from 'next/headers';
import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
export async function serverDb(){
 const jar=await cookies();
 return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
  cookies:{getAll:()=>jar.getAll(),setAll:values=>{
   try{values.forEach(({name,value,options})=>jar.set(name,value,{...options,httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'}));}
   catch{/* Server Components cannot set cookies; proxy refreshes them. */}
  }}
 });
}
export function serviceDb(){if(!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Server service role key is not configured.');return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});}
