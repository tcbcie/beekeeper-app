/*
 * TCBC Research Widget — public bloom / GDD / forage outlook card
 * -----------------------------------------------------------------
 * Drop-in JS embed for www.tcbc.ie (WordPress). Pulls anonymised
 * community bloom data from HiveCraic's public_galway_gdd view and
 * live weather from Open-Meteo. No auth required.
 *
 * Usage:
 *   <div id="tcbc-gdd-widget"></div>
 *   <script src="https://www.hivecraic.com/embed/tcbc-research-widget.js"
 *           data-target="#tcbc-gdd-widget"
 *           data-region="galway"
 *           data-theme="auto" defer></script>
 *
 * GDD / foraging formulas are duplicated from src/lib/gdd.ts so this
 * file can run as plain JS without the Next.js bundle. If you change
 * the formulas there, update them here too. See:
 * docs/features/tcbc-wordpress-research-widget.md
 */
(function () {
  'use strict'

  // ---- Config baked in at build time ----
  var SUPABASE_URL = 'https://tbhofdmfzwibysnnssnx.supabase.co'
  var SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiaG9mZG1mendpYnlzbm5zc254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3Njc2MjgsImV4cCI6MjA3NjM0MzYyOH0.uhOPPVNiccHMc9yiHwDgV3ebHu4HWizC6PEmP-kSKyU'

  var REGIONS = {
    galway: {
      label: 'Galway',
      view: 'public_galway_gdd',
      lat: 53.2707,
      lon: -9.0568,
      timezone: 'Europe/Dublin',
    },
  }

  var CHART_JS_SRC =
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
  var BLOOM_LOOKBACK_DAYS = 60 // how far back we count "still blooming" for open-ended records

  // ---- Read script tag attributes ----
  var thisScript =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName('script')
      return s[s.length - 1]
    })()

  var targetSelector =
    (thisScript && thisScript.getAttribute('data-target')) || '#tcbc-gdd-widget'
  var regionKey =
    (thisScript && thisScript.getAttribute('data-region')) || 'galway'
  var themePref =
    (thisScript && thisScript.getAttribute('data-theme')) || 'auto'

  var region = REGIONS[regionKey] || REGIONS.galway

  // ---- GDD formulas (duplicated from src/lib/gdd.ts — keep in sync!) ----
  function getSeasonalMultiplier(month) {
    if (month === 1) return 0.5
    if (month === 2) return 0.75
    return 1.0
  }

  function calculateGDDFromDaily(daily) {
    var total = 0
    var tMaxArr = daily.temperature_2m_max || []
    var tMinArr = daily.temperature_2m_min || []
    var timeArr = daily.time || []
    for (var i = 0; i < tMaxArr.length; i++) {
      var tMax = tMaxArr[i]
      var tMin = tMinArr[i]
      var dateStr = timeArr[i]
      if (tMax !== null && tMin !== null && dateStr) {
        var avg = (tMax + tMin) / 2
        if (avg > 0) {
          var month = parseInt(dateStr.slice(5, 7), 10)
          total += avg * getSeasonalMultiplier(month)
        }
      }
    }
    return Math.round(total * 10) / 10
  }

  var BEE_FLYING_THRESHOLD_C = 12
  function calculateForagingHours(tempMin, tempMax, sunshineSec, rainMm) {
    var sunshineH = (sunshineSec || 0) / 3600
    if (sunshineH <= 0 || tempMax < BEE_FLYING_THRESHOLD_C) return 0
    var warmFraction
    if (tempMin >= BEE_FLYING_THRESHOLD_C) {
      warmFraction = 1
    } else {
      var arg = Math.max(
        -1,
        Math.min(
          1,
          (2 * BEE_FLYING_THRESHOLD_C - tempMax - tempMin) / (tempMax - tempMin)
        )
      )
      warmFraction = Math.acos(arg) / Math.PI
    }
    var rainFactor = 1
    if (rainMm > 5) rainFactor = 0.5
    else if (rainMm >= 1) rainFactor = 0.75
    return Math.round(sunshineH * warmFraction * rainFactor * 10) / 10
  }

  // ---- Data fetchers ----
  function fetchJson(url, opts) {
    return fetch(url, opts || {}).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url)
      return r.json()
    })
  }

  function fetchCurrentYearGDD() {
    var now = new Date()
    var year = now.getFullYear()
    var jan = year + '-01-01'
    var today =
      year +
      '-' +
      pad2(now.getMonth() + 1) +
      '-' +
      pad2(now.getDate())
    var url =
      'https://archive-api.open-meteo.com/v1/archive?latitude=' +
      region.lat +
      '&longitude=' +
      region.lon +
      '&start_date=' +
      jan +
      '&end_date=' +
      today +
      '&daily=temperature_2m_max,temperature_2m_min&timezone=' +
      encodeURIComponent(region.timezone)
    return fetchJson(url).then(function (data) {
      if (!data || !data.daily) return null
      return calculateGDDFromDaily(data.daily)
    })
  }

  function fetchForecast() {
    var url =
      'https://api.open-meteo.com/v1/forecast?latitude=' +
      region.lat +
      '&longitude=' +
      region.lon +
      '&daily=temperature_2m_max,temperature_2m_min,sunshine_duration,precipitation_sum' +
      '&forecast_days=7&timezone=' +
      encodeURIComponent(region.timezone)
    return fetchJson(url).then(function (data) {
      if (!data || !data.daily) return []
      var days = data.daily.time || []
      var out = []
      for (var i = 0; i < days.length; i++) {
        out.push({
          date: days[i],
          foragingHours: calculateForagingHours(
            data.daily.temperature_2m_min[i],
            data.daily.temperature_2m_max[i],
            data.daily.sunshine_duration[i],
            data.daily.precipitation_sum[i]
          ),
        })
      }
      return out
    })
  }

  function fetchBlooms() {
    var url =
      SUPABASE_URL +
      '/rest/v1/' +
      region.view +
      '?select=vegetation_name,year,start_date,end_date,gdd_value,city' +
      '&order=start_date.desc'
    return fetchJson(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      },
    })
  }

  // ---- Helpers ----
  function pad2(n) {
    return n < 10 ? '0' + n : '' + n
  }

  function todayIso() {
    var d = new Date()
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
  }

  function daysBetween(a, b) {
    var ms = new Date(b).getTime() - new Date(a).getTime()
    return Math.round(ms / 86400000)
  }

  // Determine which records are currently blooming in Galway.
  // Current-year records only. "Still blooming" means:
  //   - end_date is null AND start_date within the last BLOOM_LOOKBACK_DAYS days
  //   - OR end_date is in the future / today
  function filterCurrentBlooms(records) {
    var today = todayIso()
    var currentYear = new Date().getFullYear()
    var out = []
    var seen = {}
    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      if (r.year !== currentYear) continue
      if (r.start_date > today) continue
      var stillOn
      if (r.end_date) {
        stillOn = r.end_date >= today
      } else {
        stillOn = daysBetween(r.start_date, today) <= BLOOM_LOOKBACK_DAYS
      }
      if (!stillOn) continue
      // De-dupe by vegetation name — one card per plant
      var key = (r.vegetation_name || '').trim().toLowerCase()
      if (!key || seen[key]) continue
      seen[key] = true
      out.push(r)
    }
    return out
  }

  // ---- Rendering ----
  function injectStyles() {
    if (document.getElementById('tcbc-gdd-widget-styles')) return
    var style = document.createElement('style')
    style.id = 'tcbc-gdd-widget-styles'
    style.textContent = [
      '.tcbc-gdd{',
      '  --tcbc-gdd-accent:#f59e0b;',
      '  --tcbc-gdd-bg:#ffffff;',
      '  --tcbc-gdd-text:#1f2937;',
      '  --tcbc-gdd-muted:#6b7280;',
      '  --tcbc-gdd-border:#e5e7eb;',
      '  --tcbc-gdd-card-bg:#fafafa;',
      '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;',
      '  color:var(--tcbc-gdd-text);',
      '  background:var(--tcbc-gdd-bg);',
      '  border:1px solid var(--tcbc-gdd-border);',
      '  border-radius:12px;',
      '  padding:20px;',
      '  max-width:900px;',
      '}',
      '.tcbc-gdd[data-theme="dark"]{',
      '  --tcbc-gdd-bg:#1f2937;',
      '  --tcbc-gdd-text:#f9fafb;',
      '  --tcbc-gdd-muted:#9ca3af;',
      '  --tcbc-gdd-border:#374151;',
      '  --tcbc-gdd-card-bg:#111827;',
      '}',
      '.tcbc-gdd__title{font-size:18px;font-weight:600;margin:0 0 4px;}',
      '.tcbc-gdd__subtitle{font-size:13px;color:var(--tcbc-gdd-muted);margin:0 0 16px;}',
      '.tcbc-gdd__grid{display:grid;gap:16px;grid-template-columns:1fr;}',
      '@media(min-width:720px){.tcbc-gdd__grid{grid-template-columns:repeat(3,1fr);}}',
      '.tcbc-gdd__card{background:var(--tcbc-gdd-card-bg);border:1px solid var(--tcbc-gdd-border);border-radius:10px;padding:16px;}',
      '.tcbc-gdd__card h3{margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--tcbc-gdd-muted);font-weight:600;}',
      '.tcbc-gdd__bignum{font-size:36px;font-weight:700;line-height:1;color:var(--tcbc-gdd-accent);}',
      '.tcbc-gdd__bignum-sub{font-size:12px;color:var(--tcbc-gdd-muted);margin-top:6px;}',
      '.tcbc-gdd__bloomlist{margin:0;padding:0;list-style:none;max-height:180px;overflow-y:auto;}',
      '.tcbc-gdd__bloomlist li{padding:6px 0;border-bottom:1px solid var(--tcbc-gdd-border);font-size:13px;display:flex;justify-content:space-between;align-items:baseline;gap:8px;}',
      '.tcbc-gdd__bloomlist li:last-child{border-bottom:0;}',
      '.tcbc-gdd__bloomlist .tcbc-gdd__city{font-size:11px;color:var(--tcbc-gdd-muted);white-space:nowrap;}',
      '.tcbc-gdd__empty{font-size:13px;color:var(--tcbc-gdd-muted);font-style:italic;}',
      '.tcbc-gdd__chartwrap{height:140px;position:relative;}',
      '.tcbc-gdd__footer{margin-top:14px;text-align:right;font-size:11px;color:var(--tcbc-gdd-muted);}',
      '.tcbc-gdd__footer a{color:var(--tcbc-gdd-muted);text-decoration:none;}',
      '.tcbc-gdd__footer a:hover{text-decoration:underline;}',
      '.tcbc-gdd__error{color:#dc2626;font-size:13px;}',
    ].join('')
    document.head.appendChild(style)
  }

  function resolveTheme() {
    if (themePref === 'light' || themePref === 'dark') return themePref
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  }

  function renderShell(container) {
    container.classList.add('tcbc-gdd')
    container.setAttribute('data-theme', resolveTheme())
    container.innerHTML =
      '<h2 class="tcbc-gdd__title">Bee forage &amp; bloom — ' +
      escapeHtml(region.label) +
      '</h2>' +
      '<p class="tcbc-gdd__subtitle">Live data from local beekeepers &amp; weather</p>' +
      '<div class="tcbc-gdd__grid">' +
      '  <div class="tcbc-gdd__card" data-slot="gdd">' +
      '    <h3>Current GDD (year to date)</h3>' +
      '    <div class="tcbc-gdd__bignum">…</div>' +
      '    <div class="tcbc-gdd__bignum-sub"></div>' +
      '  </div>' +
      '  <div class="tcbc-gdd__card" data-slot="blooms">' +
      '    <h3>Blooming now</h3>' +
      '    <div class="tcbc-gdd__empty">Loading…</div>' +
      '  </div>' +
      '  <div class="tcbc-gdd__card" data-slot="forage">' +
      '    <h3>This week&apos;s forage hours</h3>' +
      '    <div class="tcbc-gdd__chartwrap"><canvas></canvas></div>' +
      '  </div>' +
      '</div>' +
      '<div class="tcbc-gdd__footer">Powered by ' +
      '<a href="https://www.hivecraic.com" target="_blank" rel="noopener">HiveCraic</a></div>'
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
      )
    })
  }

  function fmtDate(iso) {
    if (!iso) return ''
    var parts = iso.split('-')
    if (parts.length !== 3) return iso
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return parseInt(parts[2], 10) + ' ' + months[parseInt(parts[1], 10) - 1]
  }

  function renderGDD(container, gdd) {
    var slot = container.querySelector('[data-slot="gdd"]')
    if (!slot) return
    var big = slot.querySelector('.tcbc-gdd__bignum')
    var sub = slot.querySelector('.tcbc-gdd__bignum-sub')
    if (gdd == null) {
      big.textContent = '—'
      sub.textContent = 'Unavailable'
      return
    }
    big.textContent = Math.round(gdd).toLocaleString()
    var d = new Date()
    sub.textContent =
      'as of ' + d.getDate() + ' ' + d.toLocaleString('en-GB', { month: 'short' })
  }

  function renderBlooms(container, blooms) {
    var slot = container.querySelector('[data-slot="blooms"]')
    if (!slot) return
    if (!blooms || !blooms.length) {
      slot.innerHTML =
        '<h3>Blooming now</h3><div class="tcbc-gdd__empty">No reports yet this season.</div>'
      return
    }
    var html = '<h3>Blooming now (' + blooms.length + ')</h3><ul class="tcbc-gdd__bloomlist">'
    for (var i = 0; i < blooms.length; i++) {
      var r = blooms[i]
      html +=
        '<li><span>' +
        escapeHtml(r.vegetation_name.trim()) +
        '</span><span class="tcbc-gdd__city">' +
        escapeHtml(r.city || '') +
        ' · ' +
        fmtDate(r.start_date) +
        '</span></li>'
    }
    html += '</ul>'
    slot.innerHTML = html
  }

  function renderForage(container, days) {
    var slot = container.querySelector('[data-slot="forage"]')
    if (!slot) return
    var canvas = slot.querySelector('canvas')
    if (!canvas || !window.Chart) return
    var labels = days.map(function (d) {
      var dt = new Date(d.date)
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()]
    })
    var values = days.map(function (d) {
      return d.foragingHours
    })
    var isDark = container.getAttribute('data-theme') === 'dark'
    var textColor = isDark ? '#9ca3af' : '#6b7280'
    // eslint-disable-next-line no-new
    new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            data: values,
            backgroundColor: '#f59e0b',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.parsed.y.toFixed(1) + ' h'
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { size: 11 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: textColor, font: { size: 11 }, stepSize: 2 },
            grid: { color: isDark ? '#374151' : '#e5e7eb' },
          },
        },
      },
    })
  }

  // ---- Boot ----
  function loadChartJs() {
    return new Promise(function (resolve, reject) {
      if (window.Chart) {
        resolve()
        return
      }
      var s = document.createElement('script')
      s.src = CHART_JS_SRC
      s.async = true
      s.onload = function () {
        resolve()
      }
      s.onerror = function () {
        reject(new Error('Failed to load Chart.js'))
      }
      document.head.appendChild(s)
    })
  }

  function boot() {
    var container = document.querySelector(targetSelector)
    if (!container) {
      console.warn('[tcbc-gdd] target not found:', targetSelector)
      return
    }
    injectStyles()
    renderShell(container)

    Promise.all([
      fetchCurrentYearGDD().catch(function () {
        return null
      }),
      fetchBlooms().catch(function () {
        return []
      }),
      fetchForecast().catch(function () {
        return []
      }),
      loadChartJs().catch(function () {
        return null
      }),
    ]).then(function (results) {
      var gdd = results[0]
      var allBlooms = results[1]
      var forecast = results[2]
      renderGDD(container, gdd)
      renderBlooms(container, filterCurrentBlooms(allBlooms || []))
      renderForage(container, forecast || [])
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()
