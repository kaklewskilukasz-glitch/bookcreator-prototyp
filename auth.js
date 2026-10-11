(function(){
const SUPABASE_URL='https://ocfxjlxxbrwkvkxqzqod.supabase.co';
const SUPABASE_KEY='sb_publishable_vQhkkzzMtEKw_oFTto4s6w_2wYlVFJD';
let sb=null;
function mount(){
 if(!window.supabase?.createClient)return setTimeout(mount,100);
 sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
 const header=document.querySelector('header');if(!header||document.getElementById('authBox'))return;
 const box=document.createElement('div');box.id='authBox';box.style.cssText='display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:flex-end;font-size:12px';
 box.innerHTML='<span id="authState">Tryb testowy</span><button id="loginBtn" style="border:0;border-radius:9px;padding:7px 10px">Zaloguj</button><button id="logoutBtn" style="display:none;border:0;border-radius:9px;padding:7px 10px">Wyloguj</button>';
 header.appendChild(box);loginBtn.onclick=authDialog;logoutBtn.onclick=async()=>{await sb.auth.signOut();await refresh()};
 sb.auth.onAuthStateChange(()=>refresh());refresh();
}
async function refresh(){const {data:{user}}=await sb.auth.getUser();authState.textContent=user?user.email:'Tryb testowy';loginBtn.style.display=user?'none':'inline-block';logoutBtn.style.display=user?'inline-block':'none'}
async function authDialog(){
 const email=prompt('E-mail testowego konta:');if(!email)return;
 const password=prompt('Hasło (minimum 6 znaków):');if(!password)return;
 let {error}=await sb.auth.signInWithPassword({email,password});
 if(error){const r=await sb.auth.signUp({email,password});error=r.error;if(!error&&!r.data.session){alert('Konto utworzone. Sprawdź e-mail i potwierdź konto, a potem kliknij Zaloguj.');return}}
 if(error)return alert('Nie udało się zalogować: '+error.message);await refresh();alert('Zalogowano. To jest nadal tryb testowy.');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();