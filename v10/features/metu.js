(() => {
  function key(name){ return 'whodis-met-' + String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-'); }
  window.whodisSaveMetNote = function(name){
    const input=document.querySelector('[data-met-note]');
    if(!input) return;
    localStorage.setItem(key(name), JSON.stringify({note:input.value.trim(), savedAt:new Date().toISOString()}));
    const status=document.querySelector('[data-met-status]');
    if(status) status.textContent='saved locally · your memory, not the cloud';
  };
  WhoDisFeatures.register({
    id:'metu', label:'Remember them', kicker:'MET U', order:50,
    run({person},api){
      const saved=JSON.parse(localStorage.getItem(key(person.name)) || 'null');
      return `
        <div class="wd-card"><b>What do you want future-you to remember?</b>
          <p>Drop the human bits: where you met, what you discussed, what you promised, and what to ask next time.</p>
          <textarea class="wd-input" rows="5" data-met-note placeholder="Met at the AI meetup. Talked about retrieval reliability. I promised to send the demo Friday.">${api.escape(saved?.note || '')}</textarea>
          <button class="wd-mini-btn" onclick="whodisSaveMetNote(${JSON.stringify(person.name)})">Save memory</button>
          <p class="wd-muted" data-met-status>${saved ? 'last saved locally' : 'nothing saved yet'}</p>
        </div>`;
    }
  });
})();