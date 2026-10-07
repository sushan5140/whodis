WhoDisFeatures.register({
  id:'replywindow', label:'Best time?', kicker:'REPLY WINDOW', order:40,
  run({person},api){
    return `
      <div class="wd-card"><b>Current call</b><p>No live public-activity feed is connected in this MVP, so whodis will not pretend it knows the perfect timing.</p></div>
      <div class="wd-card"><b>High-signal windows</b><p>Reach out soon after a new paper, launch, talk, open-source release, hiring post, award, or event appearance—when your message can reference something real.</p></div>
      <div class="wd-card"><b>For ${api.escape(person.name)}</b><p>Use their opted-in project “${api.escape(person.projects?.[0] || 'current work')}” as the context hook, then keep the ask small enough to answer quickly.</p></div>
      <div class="wd-card"><b>Don't game it</b><p>Timing should create relevance, not pressure. Avoid repeated messages or scraping private activity.</p></div>`;
  }
});