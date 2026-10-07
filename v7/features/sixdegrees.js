WhoDisFeatures.register({
  id:'sixdegrees', label:'Find warm path', kicker:'SIX DEGREES', order:30,
  run({person,me},api){
    const shared=person.shared || [];
    const pathA=shared[0] ? `You → shared interest: ${shared[0]} → their project → direct conversation` : 'You → event context → their current project → direct conversation';
    const pathB=`You → ${api.escape(person.subtitle || 'their org')} → public event/community → ${api.escape(person.name)}`;
    return `
      <div class="wd-card"><b>Shortest credible path</b><p>${api.escape(pathA)}</p></div>
      <div class="wd-card"><b>Community path</b><p>${pathB}</p></div>
      <div class="wd-card"><b>What would make it warmer?</b><p>Look for a shared public event, open-source contribution, coauthor, lab member, or community you genuinely participate in. Never fake a mutual connection.</p></div>
      <div class="wd-card"><b>Cold fallback</b><p>Lead with one concrete overlap + one useful artifact. Keep the ask small.</p></div>`;
  }
});