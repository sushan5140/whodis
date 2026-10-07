(() => {
  const STORE='whodis-orbit';
  const read=()=>JSON.parse(localStorage.getItem(STORE)||'[]');
  window.whodisToggleOrbit=function(name,subtitle){
    const list=read();
    const idx=list.findIndex(x=>x.name===name);
    if(idx>=0) list.splice(idx,1); else list.push({name,subtitle,addedAt:new Date().toISOString()});
    localStorage.setItem(STORE,JSON.stringify(list));
    const btn=document.querySelector('[data-orbit-toggle]');
    if(btn) btn.textContent=idx>=0?'Add to Orbit':'Remove from Orbit';
    const count=document.querySelector('[data-orbit-count]');
    if(count) count.textContent=list.length;
  };
  WhoDisFeatures.register({
    id:'orbit', label:'Add to Orbit', kicker:'ORBIT', order:60,
    run({person},api){
      const list=read();
      const tracked=list.some(x=>x.name===person.name);
      return `
        <div class="wd-score"><span data-orbit-count>${list.length}</span> tracked</div>
        <div class="wd-card"><b>${api.escape(person.name)}</b><p>${tracked?'Already in your Orbit.':'Not tracked yet.'} Orbit is explicit: you choose whose public updates matter to you.</p>
          <button class="wd-mini-btn" data-orbit-toggle onclick='whodisToggleOrbit(${JSON.stringify(person.name)},${JSON.stringify(person.subtitle || '')})'>${tracked?'Remove from Orbit':'Add to Orbit'}</button>
        </div>
        <div class="wd-card"><b>When a live public-source connector is added</b><p>Orbit can surface meaningful changes like new papers, releases, talks, roles or projects. This MVP stores only your watchlist locally and does not claim live monitoring.</p></div>`;
    }
  });
})();