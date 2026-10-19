/* whodis — Supabase secure profile integration, v1.
   No biometric enrollment or face matching is performed here. */
(() => {
 const URL = "https://lrzutdxsdilyxvkqshec.supabase.co";
 const KEY = "sb_publishable_RcUqJf0rUD2UFAx77Va8_g_epZf9EZl";
 const state={client:null,user:null};
 const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const csv=s=>s.split(",").map(x=>x.trim()).filter(Boolean).slice(0,15);
 const event=()=>document.querySelector("#wdEventId")?.value?.trim()||"";
 const notice=t=>{const e=document.querySelector("#wdCloudStatus");if(e)e.textContent=t};
 const wrap=document.createElement("section");wrap.id="wdCloud";wrap.style="max-width:1100px;margin:28px auto;padding:24px;border:1px solid #c9c7c0;border-radius:12px;background:#faf9f5";
 wrap.innerHTML='<div style="display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap"><div><b>whodis cloud</b><p id="wdCloudStatus">Connecting…</p></div><button id="wdLogout" type="button" hidden>Sign out</button></div><div id="wdAuth"><label>Email <input id="wdEmail" type="email" autocomplete="email" placeholder="you@example.com" style="padding:10px;max-width:280px"></label> <button id="wdLogin" type="button">Email me a sign-in link</button></div><div id="wdSelf" hidden><div style="padding:12px 0;border-block:1px solid #ddd"><strong>Event access</strong><p><label>My event <select id="wdEventId" style="padding:9px"></select></label> <button id="wdRefreshEvents" type="button">Refresh</button></p><label>New event name <input id="wdNewEvent" placeholder="Research meetup"></label> <button id="wdCreateEvent" type="button">Create event</button><p><label>Event ID <input id="wdJoinEvent" placeholder="Event UUID"></label> <label>Invite code <input id="wdJoinCode" placeholder="32-character code"></label> <button id="wdJoinEventBtn" type="button">Join by invite</button></p><p id="wdInviteOutput" style="overflow-wrap:anywhere"></p></div><p>Share your event profile with opted-in attendees. You can revoke access whenever you want.</p><label>Name <input id="wdName" maxlength="100"></label> <label>Role <input id="wdRole"></label> <label>Organization <input id="wdOrg"></label><p><label>Interests (comma separated) <input id="wdInterests" style="width:min(100%,550px)"></label></p><p><label>Looking for <input id="wdGoals" style="width:min(100%,550px)"></label></p><p><label>Projects <input id="wdProjects" style="width:min(100%,550px)"></label></p><p><label>Instagram (public URL) <input id="wdInstagram" placeholder="https://www.instagram.com/..." style="width:min(100%,550px)"></label></p><p><label>LinkedIn (public URL) <input id="wdLinkedIn" placeholder="https://www.linkedin.com/in/..." style="width:min(100%,550px)"></label></p><p><label>GitHub (public URL) <input id="wdGitHub" placeholder="https://github.com/..." style="width:min(100%,550px)"></label></p><p><label>Scholar (public URL) <input id="wdScholar" placeholder="https://scholar.google.com/..." style="width:min(100%,550px)"></label></p><label><input id="wdConsent" type="checkbox"> I opt in to sharing this profile with participants in this event.</label><p><button id="wdSave" type="button">Save event profile</button> <button id="wdRevoke" type="button">Revoke profile</button> <button id="wdDirectory" type="button">View opted-in attendees</button></p></div>';
 document.querySelector("main")?.prepend(wrap);
 const el=id=>document.getElementById(id);
 async function init(){
  try {
   const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2.76.1");
   state.client=createClient(URL,KEY,{auth:{detectSessionInUrl:true,flowType:"pkce"}});
   const {data:{user}}=await state.client.auth.getUser();await signedIn(user);
   state.client.auth.onAuthStateChange((_e,session)=>{signedIn(session?.user||null)});
  } catch(e){notice("Cloud sign-in unavailable: "+e.message)}
 }
 async function signedIn(user){
  state.user=user;el("wdAuth").hidden=!!user;el("wdSelf").hidden=!user;el("wdLogout").hidden=!user;
  notice(user?"Signed in: "+user.email:"Sign in to join an event and view opted-in profiles.");
  if(user)await refreshEvents();
 }
 const validLink=(value,host)=>{
   const raw=value.trim();if(!raw)return "";
   let u;try{u=new URL(raw)}catch{throw Error("Enter a full https:// URL for "+host)}
   if(u.protocol!=="https:" || !(u.hostname===host || (host==="linkedin.com"&&u.hostname==="www.linkedin.com") || (host==="instagram.com"&&u.hostname==="www.instagram.com") || (host==="github.com"&&u.hostname==="www.github.com") || (host==="scholar.google.com"&&u.hostname==="scholar.google.com")) || u.username || u.password)throw Error("Invalid "+host+" URL");
   return u.href;
 };
 const socials=()=>[
  validLink(el("wdInstagram").value,"instagram.com"),
  validLink(el("wdLinkedIn").value,"linkedin.com"),
  validLink(el("wdGitHub").value,"github.com"),
  validLink(el("wdScholar").value,"scholar.google.com")
 ].filter(Boolean);
 async function eventAction(action,values){
   const {data:{session}}=await state.client.auth.getSession();
   if(!session?.access_token)throw Error("Sign in first");
   const res=await fetch(URL+"/functions/v1/whodis-event-access",{method:"POST",headers:{"content-type":"application/json","apikey":KEY,"authorization":"Bearer "+session.access_token},body:JSON.stringify({action,...values})});
   const result=await res.json();if(!res.ok)throw Error(result.error||"Event request failed");return result;
 }
 async function refreshEvents(selected){
   const {data,error}=await state.client.from("whodis_members").select("event_id").eq("user_id",state.user.id);
   if(error)return notice(error.message);
   const ids=(data||[]).map(x=>x.event_id);
   const picker=el("wdEventId");picker.replaceChildren();
   for(const id of ids){const option=document.createElement("option");option.value=id;option.textContent=id;picker.append(option)}
   if(selected && ids.includes(selected))picker.value=selected;
   if(!ids.length)notice("Create an event or enter an invitation to get started.");
   else await loadOwn();
 }
 el("wdCreateEvent").onclick=async()=>{try{
   const r=await eventAction("create",{name:el("wdNewEvent").value.trim()});
   el("wdInviteOutput").textContent="Save this invitation securely — Event ID: "+r.event.id+" · Code: "+r.invite_code+" (shown only once)";
   await refreshEvents(r.event.id);notice("Event created. Share the ID and code only with invited attendees.");
 }catch(e){notice(e.message)}};
 el("wdJoinEventBtn").onclick=async()=>{try{
   const r=await eventAction("join",{event_id:el("wdJoinEvent").value.trim(),invite_code:el("wdJoinCode").value.trim()});
   el("wdJoinCode").value="";await refreshEvents(r.event.id);notice("Joined "+r.event.name);
 }catch(e){notice(e.message)}};
 el("wdRefreshEvents").onclick=()=>refreshEvents(event());
 el("wdEventId").onchange=()=>loadOwn();
 async function member(){
  if(!event())throw Error("Create or join an event first");
  const {data,error}=await state.client.from("whodis_members").select("event_id").eq("event_id",event()).eq("user_id",state.user.id).maybeSingle();
  if(error)throw error;if(!data)throw Error("You must join this event by invitation");
 }
 async function loadOwn(){
  const {data,error}=await state.client.from("whodis_profiles").select("*").eq("event_id",event()).eq("user_id",state.user.id).maybeSingle();
  if(error){notice(error.message);return}
  if(!data)return;
  for(const id of ["wdInstagram","wdLinkedIn","wdGitHub","wdScholar"])el(id).value="";
  for(const url of data.links||[]){try{const h=new URL(url).hostname;const id=h.includes("instagram")?"wdInstagram":h.includes("linkedin")?"wdLinkedIn":h.includes("github")?"wdGitHub":h.includes("scholar.google")?"wdScholar":null;if(id)el(id).value=url}catch{}}
  for(const [id,value] of Object.entries({wdName:data.display_name,wdRole:data.role,wdOrg:data.org,wdInterests:data.interests?.join(", "),wdGoals:data.goals?.join(", "),wdProjects:data.projects?.join(", ")}))el(id).value=value||"";
  el("wdConsent").checked=!!data.consent;
 }
 el("wdLogin").onclick=async()=>{const email=el("wdEmail").value.trim();if(!email)return notice("Enter your email first.");const {error}=await state.client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});notice(error?error.message:"Check your email for the sign-in link.")};
 el("wdLogout").onclick=async()=>{await state.client.auth.signOut();await signedIn(null)};
 el("wdSave").onclick=async()=>{
  try{
   if(!state.user)throw Error("Sign in first");
   const name=el("wdName").value.trim();if(!name)throw Error("Name is required");
   if(!el("wdConsent").checked)throw Error("Consent is required before publishing");
   await member();
   const profile={event_id:event(),user_id:state.user.id,attendee_id:"WD-"+state.user.id.slice(0,12).toUpperCase(),display_name:name,initials:name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase(),role:el("wdRole").value.trim(),org:el("wdOrg").value.trim(),interests:csv(el("wdInterests").value),goals:csv(el("wdGoals").value),projects:csv(el("wdProjects").value),links:socials(),consent:true,updated_at:new Date().toISOString()};
   const {error}=await state.client.from("whodis_profiles").upsert(profile,{onConflict:"event_id,user_id"});if(error)throw error;notice("Saved. Your event profile is live for signed-in event participants.");
  }catch(e){notice(e.message)}
 };
 el("wdRevoke").onclick=async()=>{
  if(!state.user)return;
  const {error}=await state.client.from("whodis_profiles").delete().eq("event_id",event()).eq("user_id",state.user.id);
  notice(error?error.message:"Profile revoked and deleted from this event.");
 };
 async function directory(){
  if(!state.user){notice("Sign in to view event profiles.");return}
  try{
   await member();
   const {data,error}=await state.client.from("whodis_profiles").select("attendee_id,display_name,initials,role,org,interests,goals,projects,links").eq("event_id",event()).eq("consent",true).limit(100);
   if(error)throw error;
   const list=(data||[]).map(p=>({code:p.attendee_id,name:escape(p.display_name),initials:escape(p.initials),role:escape(p.role),org:escape(p.org),interests:(p.interests||[]).map(escape),goals:(p.goals||[]).map(escape),projects:(p.projects||[]).map(escape),links:(p.links||[]).map(escape)}));
   if(typeof renderDirectory==="function")renderDirectory(list);
   el("directory")?.classList.remove("hidden");el("directory")?.scrollIntoView({behavior:"smooth"});
   notice(list.length+" opted-in profiles available in this event.");
  }catch(e){notice(e.message)}
 }
 el("wdDirectory").onclick=directory;
 if(typeof loadEventDirectory==="function")loadEventDirectory=directory;
 if(typeof matchFace==="function")matchFace=async()=>notice("Face recognition is disabled until biometric consent and access protection are implemented.");
 if(typeof enrollAttendee==="function")enrollAttendee=async()=>notice("Use the whodis cloud profile form above; photo enrollment is disabled.");
 document.querySelectorAll("#faceMatch,#joinPhoto,#openJoin").forEach(e=>{e.hidden=true;e.setAttribute("aria-hidden","true")});
 if(el("scanStatus"))el("scanStatus").textContent="QR badge available. Cloud face matching is temporarily disabled.";
 init();
})();
