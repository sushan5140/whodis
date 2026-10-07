WhoDisFeatures.register({
  id:'in', label:'Get in', kicker:'IN · MASTER MOVE', order:1, master:true,
  run({person,me},api){
    const shared=person.shared?.[0] || me.interests?.[0] || 'their work';
    const project=person.projects?.[0] || 'their current project';
    const org=person.subtitle || 'their current organization';
    return `
      <div class="wd-score">get in.</div>
      <div class="wd-card"><b>01 · Direct path</b><p>Talk about ${api.escape(shared)} through one concrete question. Do not lead with “I need an opportunity.”</p></div>
      <div class="wd-card"><b>02 · Value path</b><p>Build or send one tiny useful artifact around “${api.escape(project)}” — demo, failure-case audit, benchmark, reproduction, or sharp note.</p></div>
      <div class="wd-card"><b>03 · Warm path</b><p>Prefer a real shared event, project, community, lab, or open-source connection around ${api.escape(org)}. Never manufacture a mutual.</p></div>
      <div class="wd-card"><b>04 · Timing path</b><p>Use a genuine public moment—release, paper, talk, event, hiring post—as the reason your message exists now.</p></div>
      <div class="wd-card"><b>05 · Relationship path</b><p>If you meet, save what actually happened in “Remember them.” Future follow-ups should come from memory, not stalking.</p></div>
      <div class="wd-card"><b>Your next move</b><p>${api.escape(person.opener || 'Open with the strongest shared context, then ask one unusually specific question.')}</p></div>`;
  }
});