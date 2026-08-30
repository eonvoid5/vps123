(() => {
  const token = () => localStorage.getItem('void_token') || '';
  const api = async (url) => {
    const r = await fetch(url, { headers: token() ? { Authorization: `Bearer ${token()}` } : {} , cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function enhance() {
    const consoleEl = document.querySelector('section.console:not(.dream-enhanced)');
    if (!consoleEl) return;
    consoleEl.classList.add('dream-enhanced');

    let server = null;
    try {
      const list = await api('/api/servers');
      const name = document.querySelector('.server-heading h1')?.textContent?.trim();
      const badge = document.querySelector('.server-heading .eyebrow')?.textContent || '';
      const port = Number((badge.match(/:(\d+)/) || [])[1] || 0);
      server = list.find(s => (name && s.name === name) || (port && Number(s.port) === port));
    } catch (_) {}

    const layout = document.createElement('div');
    layout.className = 'dream-console-layout';
    consoleEl.parentNode.insertBefore(layout, consoleEl);
    layout.appendChild(consoleEl);

    const rail = document.createElement('aside');
    rail.className = 'dream-resource-rail glass';
    rail.innerHTML = `
      <div class="dream-rail-head"><div><b>RESOURCE USAGE</b><small>LIVE NODE TELEMETRY</small></div><span class="dream-live-pill">1H</span></div>
      <div class="dream-metric"><div><span>CPU</span><b data-dream="cpu">—</b></div><div class="dream-meter"><i data-dream-bar="cpu"></i></div></div>
      <div class="dream-metric"><div><span>MEMORY</span><b data-dream="memory">—</b></div><div class="dream-meter blue"><i data-dream-bar="memory"></i></div></div>
      <div class="dream-metric"><div><span>DISK</span><b data-dream="disk">—</b></div><div class="dream-meter purple"><i data-dream-bar="disk"></i></div></div>
      <div class="dream-mini-chart"><div class="dream-grid"></div><svg viewBox="0 0 520 130" preserveAspectRatio="none"><polyline data-dream-line="cpu" points="0,92 30,75 60,88 90,64 120,73 150,45 180,58 210,42 240,62 270,37 300,52 330,34 360,47 390,29 420,42 450,25 480,36 520,22"/><polyline data-dream-line="memory" points="0,94 30,82 60,89 90,72 120,77 150,68 180,73 210,62 240,70 270,57 300,66 330,55 360,63 390,51 420,57 450,46 480,54 520,45"/></svg></div>
      <div class="dream-rail-foot"><span>Network</span><b><em data-dream="rx">↓ —</em> <em data-dream="tx">↑ —</em></b></div>
      <div class="dream-quick-grid">
        <button data-dream-action="backup">Backup</button><button data-dream-action="refresh">Refresh</button><button data-dream-action="clear">Clear</button>
      </div>`;
    layout.appendChild(rail);

    const set = (key, val) => {
      const el = rail.querySelector(`[data-dream="${key}"]`);
      if (el) el.textContent = val;
    };
    const bar = (key, pct) => {
      const el = rail.querySelector(`[data-dream-bar="${key}"]`);
      if (el) el.style.width = `${Math.max(3, Math.min(100, pct))}%`;
    };

    rail.querySelector('[data-dream-action="clear"]')?.addEventListener('click', () => {
      consoleEl.querySelector('.logs')?.replaceChildren();
    });
    rail.querySelector('[data-dream-action="refresh"]')?.addEventListener('click', () => {
      consoleEl.querySelector('.console-head button')?.click();
    });
    rail.querySelector('[data-dream-action="backup"]')?.addEventListener('click', async () => {
      if (!server?.id) return;
      try {
        const r = await fetch(`/api/ptero/servers/${server.id}/backups`, { method: 'POST', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token()}` }, body:'{}' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      } catch (_) {}
    });

    if (!server?.id) return;
    const refreshStats = async () => {
      try {
        const s = await api(`/api/ptero/servers/${server.id}/stats`);
        const cpu = Number(s.cpu || 0);
        const mem = Number(s.memoryUsed || 0) / Math.max(1, Number(s.memory || 1)) * 100;
        const disk = Math.min(100, Number(s.disk || 0) / (100 * 1024 * 1024) * 100);
        set('cpu', `${cpu.toFixed(1)}%`); set('memory', `${Math.round(mem)}%`); set('disk', `${Math.round(disk)}%`);
        set('rx', `↓ ${formatRate(s.networkRx || 0)}`); set('tx', `↑ ${formatRate(s.networkTx || 0)}`);
        bar('cpu', cpu * 50); bar('memory', mem); bar('disk', disk);
      } catch (_) {}
    };
    await refreshStats();
    const timer = setInterval(refreshStats, 2000);
    window.addEventListener('beforeunload', () => clearInterval(timer), { once:true });
  }

  function formatRate(bytes) {
    const n = Number(bytes) || 0;
    if (n > 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB/s`;
    if (n > 1024) return `${(n / 1024).toFixed(1)} KB/s`;
    return `${n.toFixed(0)} B/s`;
  }

  const obs = new MutationObserver(() => { enhance().catch(() => {}); });
  obs.observe(document.documentElement, { childList:true, subtree:true });
  setTimeout(() => enhance().catch(() => {}), 250);
})();
