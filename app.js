const sampleShipmentData = [
  ["W1", "North Hub", "S12", "Northside", "Standard Class", "North", "Sporting Goods", "Consumer", "2024-09-10", "Delayed", 3, 236],
  ["W1", "North Hub", "S08", "Central", "Second Class", "North", "Fitness", "Corporate", "2024-09-12", "Delayed", 2, 182],
  ["W1", "North Hub", "S04", "East Market", "First Class", "North", "Apparel", "Consumer", "2024-09-15", "On-time", 0, 141],
  ["W2", "East Hub", "S07", "East Market", "Standard Class", "East", "Outdoor", "Consumer", "2024-09-18", "Delayed", 5, 318],
  ["W2", "East Hub", "S05", "South Point", "Second Class", "East", "Fitness", "Home Office", "2024-09-21", "On-time", 0, 205],
  ["W2", "East Hub", "S10", "Lakeside", "First Class", "East", "Apparel", "Consumer", "2024-09-24", "On-time", 0, 96],
  ["W3", "South Hub", "S06", "South Point", "Standard Class", "South", "Outdoor", "Corporate", "2024-09-27", "Delayed", 2, 286],
  ["W3", "South Hub", "S01", "Downtown", "First Class", "South", "Sporting Goods", "Consumer", "2024-10-01", "On-time", 0, 122],
  ["W4", "West Hub", "S03", "West End", "Standard Class", "West", "Fitness", "Corporate", "2024-10-04", "Delayed", 3, 264],
  ["W4", "West Hub", "S11", "West End", "Second Class", "West", "Apparel", "Home Office", "2024-10-08", "On-time", 0, 173]
].map((r, i) => ({
  id: `SHP-${String(i + 1).padStart(3, "0")}`, warehouse: r[0], warehouseName: r[1],
  store: r[2], storeName: r[3], shippingMode: r[4], region: r[5],
  productCategory: r[6], customerSegment: r[7], orderDate: r[8], status: r[9],
  delay: r[10], cost: r[11]
}));

const $ = id => document.getElementById(id);
const MIN_SUPPORT = 0.003;
const MIN_CONFIDENCE = 0.6;
let shipmentData = [...sampleShipmentData];
let currentData = [...shipmentData];
let exportedRules = [];

function calculateStats(data) {
  const total = data.length;
  const delayed = data.filter(s => s.status === "Delayed").length;
  const atRisk = data.filter(s => s.status === "Delayed" && s.delay >= 3).length;
  const cost = data.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
  return {
    total, delayed, atRisk, onTime: total - delayed,
    rate: total ? (total - delayed) / total * 100 : 0,
    average: total ? data.reduce((sum, s) => sum + s.delay, 0) / total : 0,
    cost
  };
}

function renderKpis(data) {
  const s = calculateStats(data);
  const dates = shipmentData.map(row => new Date(row.orderDate).valueOf()).filter(Number.isFinite).sort((a, b) => a - b);
  const midpoint = dates.length ? dates[Math.floor(dates.length / 2)] : 0;
  const previous = shipmentData.filter(row => new Date(row.orderDate).valueOf() < midpoint);
  const previousStats = calculateStats(previous);
  const rateChange = previousStats.rate ? s.rate - previousStats.rate : 0;
  $("kpis").innerHTML = [
    ["Total shipments", s.total.toLocaleString(), `${s.total ? "Current selection" : "No records"}`, ""],
    ["On-time delivery", `${s.rate.toFixed(1)}%`, `${rateChange >= 0 ? "↑" : "↓"} ${Math.abs(rateChange).toFixed(1)} pts vs earlier`, ""],
    ["Average delay", `${s.average.toFixed(1)} days`, `${s.delayed.toLocaleString()} delayed shipments`, ""],
    ["Fulfillment cost", `$${s.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, "Calculated from order costs", "warn"]
  ].map(([label, value, change, kind]) =>
    `<div class="kpi-card"><p>${label}</p><span class="value">${value}</span><span class="change ${kind}">${change}</span></div>`
  ).join("");
  $("onTimeValue").textContent = `${s.rate.toFixed(1)}%`;
  $("trendChange").innerHTML = `${rateChange >= 0 ? "↑" : "↓"} ${Math.abs(rateChange).toFixed(1)} pts <small>vs earlier records</small>`;
  $("highRiskValue").textContent = s.atRisk.toLocaleString();
  $("riskPercent").textContent = `${(data.length ? s.atRisk / data.length * 100 : 0).toFixed(1)}%`;
  $("donutTotal").textContent = s.total.toLocaleString();
  $("riskBar").style.width = `${data.length ? s.atRisk / data.length * 100 : 0}%`;
}

function renderTrend(data) {
  const grouped = new Map();
  data.forEach(row => {
    const date = row.orderDate || "Unknown";
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date).push(row);
  });
  const dated = [...grouped]
    .filter(([date]) => !Number.isNaN(new Date(date).valueOf()))
    .sort(([a], [b]) => a.localeCompare(b));
  const bucketCount = Math.min(60, Math.max(1, Math.ceil(dated.length / 6)));
  const bucketSize = Math.max(1, Math.ceil(dated.length / bucketCount));
  const buckets = [];
  for (let i = 0; i < dated.length; i += bucketSize) {
    const entries = dated.slice(i, i + bucketSize);
    buckets.push({
      date: entries[0][0],
      endDate: entries[entries.length - 1][0],
      rows: entries.flatMap(([, rows]) => rows)
    });
  }
  const values = buckets.length ? buckets.map(bucket => calculateStats(bucket.rows).rate) : [0];
  const w = 720, h = 180;
  const coords = values.map((value, i) => `${values.length === 1 ? w / 2 : i * (w / (values.length - 1))},${h - value / 100 * h}`).join(" ");
  const markers = values.length <= 30 ? values.map((value, i) => `<circle cx="${values.length === 1 ? w / 2 : i * (w / (values.length - 1))}" cy="${h - value / 100 * h}" r="2.5" fill="#fff" stroke="#32a871" stroke-width="2"/>`).join("") : "";
  $("trendChart").innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bce9d0" stop-opacity=".55"/><stop offset="1" stop-color="#bce9d0" stop-opacity="0"/></linearGradient></defs><polygon points="0,${h} ${coords} ${w},${h}" fill="url(#area)"/><polyline points="${coords}" fill="none" stroke="#32a871" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${markers}</svg>`;
  const dates = buckets.map(bucket => bucket.date);
  const axis = $("trendAxis");
  axis.innerHTML = [buckets[0]?.date, buckets[Math.floor(buckets.length / 2)]?.date, buckets[buckets.length - 1]?.endDate]
    .filter(Boolean)
    .map(date => `<span>${new Date(date).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })}</span>`)
    .join("");
}

function renderWarehouse(data) {
  const groups = [...new Map(shipmentData.map(s => [s.warehouse, s.warehouseName]))].map(([id, name]) => {
    const rows = data.filter(s => s.warehouse === id);
    return { name, rate: rows.length ? rows.filter(s => s.status === "Delayed").length / rows.length * 100 : 0 };
  });
  const max = Math.max(...groups.map(x => x.rate), 1);
  $("warehouseChart").innerHTML = groups.map(x => `<div class="bar-item"><div class="bar-wrap"><div class="bar-fill ${x.rate > 45 ? "hot" : ""}" style="height:${Math.max(4, x.rate / max * 100)}%"></div></div><b>${x.rate.toFixed(0)}%</b><small>${x.name.replace(" Hub", "")}</small></div>`).join("");
}

function renderStatus(data) {
  const s = calculateStats(data);
  const delayedOnly = Math.max(0, s.delayed - s.atRisk);
  const onPercent = data.length ? s.onTime / data.length * 100 : 0;
  const delayedPercent = data.length ? delayedOnly / data.length * 100 : 0;
  $("donut").style.background = `conic-gradient(#4caf7e 0 ${onPercent}%,#f1ad68 ${onPercent}% ${onPercent + delayedPercent}%,#e87a6d ${onPercent + delayedPercent}% 100%)`;
  $("statusLegend").innerHTML = `<span><i style="background:#4caf7e"></i>On-time <b>${s.onTime}</b></span><span><i style="background:#f1ad68"></i>Delayed <b>${delayedOnly}</b></span><span><i style="background:#e87a6d"></i>At risk <b>${s.atRisk}</b></span>`;
}

function localPatterns(data) {
  const attrs = [
    ["Shipping mode", s => s.shippingMode], ["Region", s => s.region],
    ["Product category", s => s.productCategory], ["Order month", s => (s.orderDate || "").slice(0, 7)],
    ["Customer segment", s => s.customerSegment]
  ];
  const delayed = data.filter(s => s.status === "Delayed");
  const total = data.length;
  const found = [];
  for (let i = 0; i < attrs.length; i++) for (let j = i + 1; j < attrs.length; j++) {
    for (let k = j + 1; k < attrs.length; k++) {
      const selected = [attrs[i], attrs[j], attrs[k]];
      const combos = new Map();
      data.forEach(row => {
        const key = selected.map(([label, getter]) => `${label}=${getter(row)}`).join("|");
        if (!combos.has(key)) combos.set(key, []);
        combos.get(key).push(row);
      });
      combos.forEach((rows, key) => {
        const support = total ? rows.length / total : 0;
        const confidence = rows.length ? rows.filter(s => s.status === "Delayed").length / rows.length : 0;
        if (support >= MIN_SUPPORT && confidence >= MIN_CONFIDENCE) {
          found.push({ tags: key.split("|"), support, confidence, lift: delayed.length ? confidence / (delayed.length / total) : 0, count: rows.length });
        }
      });
    }
  }
  return found.sort((a, b) => b.lift - a.lift).slice(0, 4);
}

function patterns(data) {
  return exportedRules.length ? exportedRules.filter(rule => rule.support >= MIN_SUPPORT && rule.confidence >= MIN_CONFIDENCE).slice(0, 4) : localPatterns(data);
}

function renderPatterns(data) {
  const rows = patterns(data);
  $("patternList").innerHTML = rows.length ? rows.map((r, i) => `<div class="pattern-row"><div class="pattern-name"><i></i><div><span>${i === 0 ? "Strongest pattern" : "Frequent combination"}</span><div class="pattern-tags">${r.tags.map(tag => `<span class="tag">${tag.replace("=", " · ")}</span>`).join("")}</div></div></div><div class="metric"><strong>${(r.support * 100).toFixed(1)}%</strong><small>Support · ${r.count} shipments</small></div><div class="metric"><strong>${(r.confidence * 100).toFixed(1)}%</strong><small>Confidence</small></div><div class="metric"><span class="lift">${r.lift.toFixed(2)}×</span><small>Lift</small></div><div class="metric"><strong class="status-badge">Delayed</strong></div></div>`).join("") : `<p class="muted">No patterns meet the current thresholds.</p>`;
}

function renderRoutes(data) {
  const groups = new Map();
  data.forEach(s => {
    const key = `${s.warehouseName} → ${s.storeName}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  });
  $("routeTable").innerHTML = [...groups].map(([route, rows]) => ({ route, rate: rows.filter(x => x.status === "Delayed").length / rows.length * 100, total: rows.length })).sort((a, b) => b.rate - a.rate).slice(0, 4).map(r => `<div class="route-row"><div><strong>${r.route}</strong><small>${r.total} shipments this period</small></div><b>${r.rate.toFixed(0)}%</b><span class="status-badge ${r.rate < 50 ? "medium" : ""}">${r.rate > 60 ? "High" : "Medium"}</span></div>`).join("");
}

function renderRecommendations(data) {
  const delayed = data.filter(s => s.status === "Delayed");
  const mode = [...new Set(delayed.map(s => s.shippingMode))][0] || "selected shipping modes";
  const regionCounts = [...new Set(delayed.map(s => s.warehouseName))].map(name => [name, delayed.filter(s => s.warehouseName === name).length]).sort((a, b) => b[1] - a[1]);
  const focus = regionCounts[0]?.[0] || "the selected network";
  $("recommendations").innerHTML = [
    ["↗", `Review ${mode} shipments`, `${delayed.filter(s => s.shippingMode === mode).length} delayed shipments use this shipping mode.`],
    ["◷", `Prioritize ${focus}`, `${regionCounts[0]?.[1] || 0} delayed shipments are associated with this warehouse or region.`],
    ["▣", "Use the strongest pattern", `${patterns(data)[0]?.confidence ? `${(patterns(data)[0].confidence * 100).toFixed(0)}% confidence` : "No qualifying rule"} supports the next intervention.`]
  ].map(x => `<div class="recommendation"><span class="rec-icon">${x[0]}</span><div><strong>${x[1]}</strong><p>${x[2]}</p></div></div>`).join("");
}

function render() {
  const warehouse = $("warehouseFilter").value, status = $("statusFilter").value;
  currentData = shipmentData.filter(s => (warehouse === "all" || s.warehouse === warehouse) && (status === "all" || s.status === status));
  renderKpis(currentData); renderTrend(currentData); renderWarehouse(currentData); renderStatus(currentData);
  renderPatterns(currentData); renderRoutes(currentData); renderRecommendations(currentData);
}

function fillFilters() {
  $("warehouseFilter").innerHTML = '<option value="all">All warehouses</option>';
  [...new Map(shipmentData.map(s => [s.warehouse, s.warehouseName]))].forEach(([id, name]) => $("warehouseFilter").insertAdjacentHTML("beforeend", `<option value="${id}">${name}</option>`));
}

function loadCsv(file) {
  $("csvFile").setCustomValidity("");
  const worker = new Worker("csv-worker.js");
  worker.onmessage = event => {
    worker.terminate();
    if (event.data.error) {
      $("csvFile").setCustomValidity(event.data.error);
      $("csvFile").reportValidity();
      return;
    }
    shipmentData = event.data.rows; fillFilters(); render();
  };
  worker.onerror = () => {
    worker.terminate();
    $("csvFile").setCustomValidity("Unable to process the selected CSV file.");
    $("csvFile").reportValidity();
  };
  const reader = new FileReader();
  reader.onload = () => worker.postMessage(String(reader.result));
  reader.onerror = () => $("csvFile").setCustomValidity("Unable to read the selected CSV file.");
  reader.readAsText(file, "windows-1252");
}

function exportReport() {
  const s = calculateStats(currentData);
  const report = `ROUTEWISE LOGISTICS REPORT\nGenerated: ${new Date().toLocaleString()}\n\nTotal shipments: ${s.total}\nOn-time rate: ${s.rate.toFixed(1)}%\nDelayed shipments: ${s.delayed}\nAt-risk shipments: ${s.atRisk}\nAverage delay: ${s.average.toFixed(1)} days\nFulfillment cost: $${s.cost.toFixed(0)}\n\nTOP DELAY PATTERNS\n${patterns(currentData).map(p => `${p.tags.join(" + ")} -> Delayed | support ${(p.support * 100).toFixed(1)}% | confidence ${(p.confidence * 100).toFixed(1)}% | lift ${p.lift.toFixed(2)}x`).join("\n")}`;
  const url = URL.createObjectURL(new Blob([report], { type: "text/plain" }));
  const link = document.createElement("a"); link.href = url; link.download = "routewise-report.txt"; link.click(); URL.revokeObjectURL(url);
}

fetch("association-rules.json").then(response => response.ok ? response.json() : null).then(payload => {
  exportedRules = payload?.rules || [];
  $("dataSource").textContent = payload ? `Ready · ${payload.transactions.toLocaleString()} shipments` : "Using sample data";
  renderPatterns(currentData);
}).catch(() => { $("dataSource").textContent = "Using sample data"; });

fillFilters();
$("warehouseFilter").addEventListener("change", render);
$("statusFilter").addEventListener("change", render);
$("csvFile").addEventListener("change", event => { const [file] = event.target.files; if (file) loadCsv(file); });
$("resetBtn").addEventListener("click", () => { $("warehouseFilter").value = "all"; $("statusFilter").value = "all"; render(); });
$("exportBtn").addEventListener("click", exportReport);
$("allPatternsBtn").addEventListener("click", () => document.querySelector(".patterns-card").scrollIntoView({ behavior: "smooth" }));
render();
