import {requireProfile} from '@/lib/auth';
import {logout} from './login/actions';
export const metadata={title:'Dashboard',robots:{index:false,follow:false}};
export default async function Admin(){const profile=await requireProfile();return <div className="container section"><p className="eyebrow">{profile.role} WORKSPACE</p><h1>Welcome back, {profile.full_name||'there'}.</h1><p>Your job workspace is ready.</p><form action={logout}><button className="button secondary">Sign out</button></form></div>}
