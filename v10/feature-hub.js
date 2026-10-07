(() => {
  const featureFiles = [
    'features/beforeisayhi.js',
    'features/doorin.js',
    'features/sixdegrees.js',
    'features/replywindow.js',
    'features/metu.js',
    'features/roomintel.js',
    'features/who2meet.js',
    'features/orbit.js',
    'features/in.js'
  ];

  const features = new Map();
  let activePerson = null;

  const api = {
    register(feature) {
      if (!feature?.id || !feature?.label || typeof feature.run !== 'function') return;
      features.set(feature.id, feature);
      renderActions();
      renderEventLauncher();
    },
    get(id) { return features.get(id); },
    list() { return [...features.values()]; },
    context() {
      const panel = document.getElementById('resultPanel');
      const name = panel?.querySelector('.result-top h2')?.textContent?.trim() || '';
      const subtitle = panel?.querySelector('.result-top p')?.textContent?.trim() || '';
      const cards = [...(panel?.querySelectorAll('.brief-card') || [])];
      const byLabel = label => cards.find(c => c.querySelector('label')?.textContent?.trim() === label);
      const text = label => byLabel(label)?.querySelector('p')?.textContent?.trim() || '';
      const tags = label => [...(byLabel(label)?.querySelectorAll('.tag') || [])].map(x => x.textContent.trim());
      const me = JSON.parse(localStorage.getItem('whodis-me') || 'null') || {
        name: 'Arjun',
        role: 'AI / CS student & builder',
        interests: ['RAG','multimodal AI','computer vision','agents','research'],
        goals: ['research collaborators','mentors','startup builders']
      };
      activePerson = name ? {
        name,
        subtitle,
        shared: tags('SHARED CONTEXT'),
        goals: tags("THEY'RE LOOKING FOR"),
        why: text('WHY YOU SHOULD TALK'),
        opener: text('BEST OPENER'),
        projects: text('THEIR PROJECTS').split(' · ').filter(Boolean),
        links: text('OPTED-IN LINKS').split(' · ').filter(Boolean)
      } : activePerson;
      return { person: activePerson, me, eventId: document.getElementById('eventId')?.value || 'demo-event' };
    },
    open(id) {
      const feature = features.get(id);
      if (!feature) return;
      const ctx = api.context();
      if (feature.scope !== 'event' && !ctx.person) return;
      const modal = ensureModal();
      modal.querySelector('[data-feature-title]').textContent = feature.label;
      modal.querySelector('[data-feature-kicker]').textContent = feature.kicker || 'WHO DIS · NEXT MOVE';
      const body = modal.querySelector('[data-feature-body]');
      body.innerHTML = '<div class="wd-loading">thinking in context…</div>';
      modal.classList.add('open');
      Promise.resolve(feature.run(ctx, api)).then(html => {
        body.innerHTML = html || '<p class="wd-muted">Nothing useful surfaced yet.</p>';
      }).catch(err => {
        body.innerHTML = '<p class="wd-muted">Couldn\'t run this move: ' + escapeHtml(err?.message || 'unknown error') + '</p>';
      });
    },
    escape: escapeHtml
  };
  window.WhoDisFeatures = api;

  function escapeHtml(value='') {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function ensureStyles() {
    if (document.getElementById('wd-feature-styles')) return;
    const style = document.createElement('style');
    style.id='wd-feature-styles';
    style.textContent=`
      .wd-next{grid-column:1/-1;margin-top:4px;padding:18px;border:1px solid #2a2a30;border-radius:18px;background:linear-gradient(135deg,#101012,#17171b)}.wd-event-launcher{margin-top:14px;padding:24px}
      .wd-next-head{display:flex;justify-content:space-between;gap:14px;align-items:end;margin-bottom:14px}.wd-next-head h3{margin:4px 0 0;font-size:22px;letter-spacing:-.03em}.wd-next-head p{margin:0;color:#777;font-size:12px}
      .wd-actions{display:flex;gap:8px;flex-wrap:wrap}.wd-action{border:1px solid #34343b;background:#1c1c20;color:#f4f4f5;border-radius:999px;padding:10px 13px;font-size:12px;font-weight:800;transition:.18s}.wd-action:hover{transform:translateY(-1px);border-color:#5a5a63}.wd-action.master{background:#f4f4f5;color:#0a0a0b}
      .wd-modal{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(10px);z-index:1000;display:none;place-items:center;padding:18px}.wd-modal.open{display:grid}.wd-sheet{width:min(720px,100%);max-height:86vh;overflow:auto;border:1px solid #303037;background:#101012;border-radius:26px;padding:22px;box-shadow:0 30px 120px rgba(0,0,0,.55)}.wd-sheet-head{display:flex;justify-content:space-between;gap:14px;align-items:start}.wd-sheet-head h2{margin:4px 0 0;font-size:34px;letter-spacing:-.04em}.wd-close{border:1px solid #303037;background:#18181b;color:#aaa;border-radius:12px;padding:9px 12px}.wd-output{margin-top:20px}.wd-card{border:1px solid #28282e;background:#151518;border-radius:18px;padding:16px;margin-top:10px}.wd-card b{display:block;margin-bottom:7px}.wd-card p{margin:0;color:#b3b3bb;line-height:1.55}.wd-kicker{font-size:10px;letter-spacing:.18em;color:#777;font-weight:900}.wd-muted,.wd-loading{color:#85858e;line-height:1.55}.wd-score{font-size:42px;font-weight:900;letter-spacing:-.05em}.wd-input{width:100%;background:#0d0d0f;border:1px solid #303037;color:#eee;border-radius:12px;padding:12px;margin-top:8px}.wd-mini-btn{margin-top:10px;border:1px solid #3a3a41;background:#eee;color:#111;border-radius:12px;padding:10px 13px;font-weight:800}
      @media(max-width:800px){.wd-next-head{display:block}.wd-next-head p{margin-top:8px}.wd-sheet-head h2{font-size:27px}}
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    ensureStyles();
    let modal = document.getElementById('wdFeatureModal');
    if (modal) return modal;
    modal=document.createElement('div');
    modal.id='wdFeatureModal';
    modal.className='wd-modal';
    modal.innerHTML=`<div class="wd-sheet"><div class="wd-sheet-head"><div><div class="wd-kicker" data-feature-kicker></div><h2 data-feature-title></h2></div><button class="wd-close" data-feature-close>Close</button></div><div class="wd-output" data-feature-body></div></div>`;
    modal.addEventListener('click', e => { if (e.target===modal || e.target.matches('[data-feature-close]')) modal.classList.remove('open'); });
    document.body.appendChild(modal);
    return modal;
  }

  function renderEventLauncher() {
    ensureStyles();
    const eventFeatures=[...features.values()].filter(f=>f.scope==='event').sort((a,b)=>(a.order||99)-(b.order||99));
    if(!eventFeatures.length) return;
    let launcher=document.getElementById('wdEventLauncher');
    if(!launcher){
      launcher=document.createElement('section');
      launcher.id='wdEventLauncher';
      launcher.className='panel wd-event-launcher';
      const anchor=document.querySelector('.profile-builder');
      anchor?.parentNode?.insertBefore(launcher,anchor);
    }
    if(!launcher) return;
    launcher.innerHTML=`<div class="wd-next-head"><div><div class="wd-kicker">EVENT INTEL</div><h3>walk into the room with a plan.</h3></div><p>public agenda / speaker / booth context</p></div><div class="wd-actions">${eventFeatures.map(f=>`<button class="wd-action" data-wd-event-feature="${escapeHtml(f.id)}">${escapeHtml(f.label)}</button>`).join('')}</div>`;
    launcher.querySelectorAll('[data-wd-event-feature]').forEach(btn=>btn.onclick=()=>api.open(btn.dataset.wdEventFeature));
  }

  function renderActions() {
    ensureStyles();
    const panel=document.getElementById('resultPanel');
    const brief=panel?.querySelector('.brief');
    if (!brief || !panel.querySelector('.result-top')) return;
    let wrap=brief.querySelector('.wd-next');
    if (!wrap) {
      wrap=document.createElement('div');
      wrap.className='wd-next';
      brief.appendChild(wrap);
    }
    const ordered=[...features.values()].sort((a,b)=>(a.order||99)-(b.order||99));
    wrap.innerHTML=`<div class="wd-next-head"><div><div class="wd-kicker">NEXT MOVE</div><h3>okay, now what do we do with this connection?</h3></div><p>public + opted-in context only</p></div><div class="wd-actions">${ordered.map(f=>`<button class="wd-action ${f.master?'master':''}" data-wd-feature="${escapeHtml(f.id)}">${escapeHtml(f.label)}</button>`).join('')}</div>`;
    wrap.querySelectorAll('[data-wd-feature]').forEach(btn=>btn.onclick=()=>api.open(btn.dataset.wdFeature));
  }

  const observer=new MutationObserver(()=>renderActions());
  const panel=document.getElementById('resultPanel');
  if(panel) observer.observe(panel,{childList:true,subtree:true});

  renderEventLauncher();

  featureFiles.forEach(src=>{
    const script=document.createElement('script');
    script.src=src;
    script.defer=true;
    script.onerror=()=>{};
    document.body.appendChild(script);
  });
})();