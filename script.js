/* ---------- Helpers ---------- */
function pct(x) { return (x * 100).toFixed(1) + "%"; }
function el(id) { return document.getElementById(id); }

/* Builds one row of a "theory vs experiment" bar chart */
function barRow(label, expected, actual, count) {
  return `
    <div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${actual * 100}%"></div>
        <div class="bar-theory" style="left:${expected * 100}%"></div>
      </div>
      <div class="bar-value">${pct(actual)} (${count})</div>
    </div>`;
}

/* ---------- Tabs ---------- */
document.querySelectorAll("#tabs button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#tabs button").forEach(b => b.classList.remove("active"));
    document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
    btn.classList.add("active");
    el(btn.dataset.tab).classList.add("active");
  });
});

/* ================= 1. COIN FLIPS ================= */
let heads = 0, tails = 0;

function flipCoin(n) {
  let last = "";
  for (let i = 0; i < n; i++) {
    if (Math.random() < 0.5) { heads++; last = "Heads"; }
    else                     { tails++; last = "Tails"; }
  }
  el("coinResult").textContent = (n === 1) ? last : n + " flips done";
  updateCoin();
}

function updateCoin() {
  const total = heads + tails;
  el("cTotal").textContent = total;
  el("cHeads").textContent = heads;
  el("cTails").textContent = tails;
  const h = total ? heads / total : 0;
  const t = total ? tails / total : 0;
  el("coinBars").innerHTML = barRow("Heads", 0.5, h, heads) + barRow("Tails", 0.5, t, tails);
}

function resetCoin() {
  heads = 0; tails = 0;
  el("coinResult").textContent = "?";
  updateCoin();
}

/* ================= 2. DICE ROLLS ================= */
let diceCounts = {};

/* Theoretical probability of a value in the current mode */
function diceTheory(value, mode) {
  if (mode === 1) return 1 / 6;
  const ways = 6 - Math.abs(value - 7);   // number of ways to make each sum
  return ways / 36;
}

function diceValues(mode) {
  const values = [];
  const start = (mode === 1) ? 1 : 2;
  const end   = (mode === 1) ? 6 : 12;
  for (let v = start; v <= end; v++) values.push(v);
  return values;
}

function rollDice(n) {
  const mode = Number(el("diceMode").value);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    last = (mode === 1) ? d1 : d1 + d2;
    diceCounts[last] = (diceCounts[last] || 0) + 1;
  }
  el("diceResult").textContent = (n === 1) ? last : n + " rolls done";
  updateDice();
}

function updateDice() {
  const mode = Number(el("diceMode").value);
  const values = diceValues(mode);
  let total = 0;
  values.forEach(v => total += (diceCounts[v] || 0));

  let html = "", best = "–", bestCount = 0;
  values.forEach(v => {
    const c = diceCounts[v] || 0;
    if (c > bestCount) { bestCount = c; best = v; }
    html += barRow(v, diceTheory(v, mode), total ? c / total : 0, c);
  });
  el("diceBars").innerHTML = html;
  el("dTotal").textContent = total;
  el("dMost").textContent = best;
}

function resetDice() {
  diceCounts = {};
  el("diceResult").textContent = "?";
  updateDice();
}

/* ================= 3. SIMULATION ================= */
function runSimulation() {
  const n = Number(el("simN").value);
  let p = Number(el("simP").value);
  if (isNaN(p) || p < 0 || p > 1) { p = 0.5; el("simP").value = 0.5; }

  // Run the tosses and remember the running proportion at about 200 points
  const step = Math.max(1, Math.floor(n / 200));
  const points = [];
  let h = 0;
  for (let i = 1; i <= n; i++) {
    if (Math.random() < p) h++;
    if (i % step === 0 || i === n) points.push({ x: i, y: h / i });
  }

  drawChart(points, n, p);
  const exp = h / n;
  el("sTheory").textContent = p.toFixed(3);
  el("sExp").textContent = exp.toFixed(3);
  el("sDiff").textContent = Math.abs(exp - p).toFixed(3);
}

function drawChart(points, n, p) {
  const canvas = el("simChart");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const left = 55, right = 20, top = 20, bottom = 45;
  const plotW = W - left - right, plotH = H - top - bottom;

  ctx.clearRect(0, 0, W, H);
  ctx.font = "13px Segoe UI, Arial";
  ctx.fillStyle = "#5b6478";
  ctx.strokeStyle = "#e0e4f2";
  ctx.lineWidth = 1;

  const X = i => left + (i / n) * plotW;         // trial number -> pixel
  const Y = v => top + (1 - v) * plotH;          // probability (0 to 1) -> pixel

  // Grid lines and y-axis labels
  for (let v = 0; v <= 1.0001; v += 0.25) {
    ctx.beginPath(); ctx.moveTo(left, Y(v)); ctx.lineTo(W - right, Y(v)); ctx.stroke();
    ctx.fillText(v.toFixed(2), 10, Y(v) + 4);
  }
  ctx.fillText("Number of tosses: 0", left, H - 15);
  ctx.textAlign = "right";
  ctx.fillText(n.toLocaleString(), W - right, H - 15);
  ctx.textAlign = "left";

  // Theoretical line (dashed red)
  ctx.strokeStyle = "#b4463c"; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.moveTo(left, Y(p)); ctx.lineTo(W - right, Y(p)); ctx.stroke();
  ctx.setLineDash([]);

  // Experimental running proportion (solid indigo)
  ctx.strokeStyle = "#3f4fb5"; ctx.lineWidth = 2.5;
  ctx.beginPath();
  points.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(X(pt.x), Y(pt.y)); else ctx.lineTo(X(pt.x), Y(pt.y));
  });
  ctx.stroke();

  // Legend
  ctx.fillStyle = "#3f4fb5"; ctx.fillText("Experimental", left + 10, top + 14);
  ctx.fillStyle = "#b4463c"; ctx.fillText("Theoretical", left + 110, top + 14);
}

/* ================= 4. CALCULATOR ================= */
function setExample(f, t) {
  el("fav").value = f; el("tot").value = t;
  calcBasic();
}

function calcBasic() {
  const f = Number(el("fav").value), t = Number(el("tot").value);
  const out = el("basicOut");
  if (!Number.isFinite(f) || !Number.isFinite(t) || t <= 0 || f < 0 || f > t) {
    out.innerHTML = '<span class="error">Please enter a total above 0 and a favourable number between 0 and the total.</span>';
    return;
  }
  const p = f / t;
  out.innerHTML = `
    <div class="formula">P(E) = ${f} / ${t} = ${p.toFixed(4)}</div>
    <p>As a percentage: <b>${pct(p)}</b></p>
    <p>Probability of NOT happening: 1 − ${p.toFixed(4)} = <b>${(1 - p).toFixed(4)}</b> (${pct(1 - p)})</p>
    <p>Odds: <b>${f} : ${t - f}</b> (favourable : unfavourable)</p>`;
}

function calcTwo() {
  const a = Number(el("pa").value), b = Number(el("pb").value);
  const out = el("twoOut");
  if (![a, b].every(x => Number.isFinite(x) && x >= 0 && x <= 1)) {
    out.innerHTML = '<span class="error">Both probabilities must be between 0 and 1.</span>';
    return;
  }
  const both   = a * b;
  const either = a + b - a * b;
  const neither = (1 - a) * (1 - b);
  out.innerHTML = `
    <div class="formula">P(A and B) = ${a} × ${b} = ${both.toFixed(4)}</div>
    <p>P(A or B) = P(A) + P(B) − P(A and B) = <b>${either.toFixed(4)}</b></p>
    <p>P(neither) = (1 − ${a}) × (1 − ${b}) = <b>${neither.toFixed(4)}</b></p>
    <p style="color:#5b6478;font-size:0.9rem">These formulas assume the two events are independent.</p>`;
}

/* ---------- Start-up: draw the empty charts and first results ---------- */
updateCoin();
updateDice();
calcBasic();
calcTwo();
runSimulation();