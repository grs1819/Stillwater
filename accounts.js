import {createClient} from './vendor/supabase.js';
import {accountConfig} from './account-config.js';
export function createAccounts({namespace,onSession,onError}){
 if(!accountConfig.enabled||!accountConfig.publishableKey)return null;
 const client=createClient(accountConfig.url,accountConfig.publishableKey,{
  auth:{storageKey:`${namespace}-auth`,flowType:'pkce',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true},
 });
 // Supabase serializes auth callbacks internally; never await another auth call here.
 const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{
  setTimeout(()=>Promise.resolve(onSession(session)).catch(onError),0);
 });
 return {
  client,environment:accountConfig.environment,
  clientFor(owner){return createClient(accountConfig.url,accountConfig.publishableKey,{
   accessToken:async()=>{
    const {data:{session},error}=await client.auth.getSession();
    if(error)throw error;
    if(session?.user.id!==owner)throw Error('Sign in to this account again to sync.');
    return session.access_token;
   },
  });},
  async sendCode(email){const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(error)throw error;},
  async verifyCode(email,token){const {error}=await client.auth.verifyOtp({email,token,type:'email'});if(error)throw error;},
  async signOut(){const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;},
  dispose(){subscription.unsubscribe();client.auth.stopAutoRefresh();},
 };
}
