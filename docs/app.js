/* ============================================================
   Arma Tu Semestre — app.js
   Carga horarios.json, ofrece búsqueda/filtro y constructor
   de horario semanal con detección de conflictos.
   ============================================================ */

const DATA_URL = "data/horarios.json";
const LS_KEY   = "armatusemestre_v1";

const DAYS       = ["L", "M", "X", "J", "V", "S"];
const DAY_LABELS = { L: "Lunes", M: "Martes", X: "Miércoles", J: "Jueves", V: "Viernes", S: "Sábado" };

const GRID_START_H = 7;
const GRID_END_H   = 22;
const SLOT_MIN     = 30;

const COLORS = [
  "#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5",
];

// ---- Estado global ----
let allSections  = [];
let selectedMap  = new Map(); // id -> section
let colorMap     = new Map(); // clave -> color
let colorIdx     = 0;
let pendingAdd   = null;      // sección pendiente de confirmar (conflicto)
let gridBuilt    = false;

// ---- Utilidades de tiempo ----
function toMin(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
}

function timesOverlap(a, b) {
  return toMin(a.inicio) < toMin(b.fin) && toMin(b.inicio) < toMin(a.fin);
}

function sectionsConflict(a, b) {
  if (!a.horario || !b.horario) return false;
  const shareDay = a.horario.dias.some((d) => b.horario.dias.includes(d));
  return shareDay && timesOverlap(a.horario, b.horario);
}

function getColor(clave) {
  if (!colorMap.has(clave)) {
    colorMap.set(clave, COLORS[colorIdx % COLORS.length]);
    colorIdx++;
  }
  return colorMap.get(clave);
}

// ---- Estado / UI ----
function setStatus(msg, isError = false) {
  const el = document.getElementById("data-status");
  el.textContent = msg;
  el.className = "data-status" + (isError ? " error" : "");
}

function showToast(msg, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast toast-${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add("hidden"), 3000);
}

// ---- Carga de datos ----
async function loadData() {
  setStatus("Cargando horarios…");
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allSections = data.secciones ?? [];

    const gen = data.meta?.generated_at;
    document.getElementById("semestre-label").textContent = gen
      ? new Date(gen).toLocaleDateString("es-DO", { month: "long", year: "numeric" })
      : "—";

    setStatus(`${allSections.length.toLocaleString()} secciones`);
    restoreFromStorage();
    buildGrid();
    renderSelectedList();
    renderResults();
  } catch (err) {
    console.error("Error cargando datos:", err);
    setStatus("⚠ Sin datos disponibles", true);
    document.getElementById("search-results").innerHTML =
      '<p class="search-hint">Los datos aún no están disponibles. El scraper debe ejecutarse primero.</p>';
  }
}

// ---- Búsqueda ----
function normalize(str) {
  return String(str).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function getSearchResults() {
  const q       = normalize(document.getElementById("search-input").value.trim());
  const campus  = document.getElementById("campus-filter").value;
  const avail   = document.getElementById("available-only").checked;

  if (q.length < 2 && !campus) return [];

  return allSections
    .filter((s) => {
      if (campus && s.campus !== campus) return false;
      if (avail && s.cupo > 0 && s.disponibles === 0) return false;
      if (q.length >= 2) {
        return (
          normalize(s.clave).includes(q) ||
          normalize(s.nombre).includes(q) ||
          normalize(s.profesor).includes(q) ||
          normalize(s.seccion).includes(q)
        );
      }
      return true;
    })
    .slice(0, 80);
}

function renderResults() {
  const container = document.getElementById("search-results");
  const countEl   = document.getElementById("results-count");
  const results   = getSearchResults();
  const q         = document.getElementById("search-input").value.trim();
  const campus    = document.getElementById("campus-filter").value;

  if (results.length === 0) {
    countEl.textContent = "";
    container.innerHTML =
      q.length < 2 && !campus
        ? '<p class="search-hint">Escribe al menos 2 caracteres para buscar</p>'
        : '<p class="search-hint">No se encontraron resultados</p>';
    return;
  }

  countEl.textContent = `${results.length} resultado${results.length !== 1 ? "s" : ""}`;

  container.innerHTML = results
    .map((s) => {
      const isSelected = selectedMap.has(s.id);
      const isFull     = s.cupo > 0 && s.disponibles === 0;
      const horarioStr = s.horario
        ? `${s.horario.dias.join("")} ${s.horario.inicio}–${s.horario.fin}`
        : s.horario_raw || "—";

      const availBadge = s.cupo > 0
        ? `<span class="badge ${s.disponibles > 0 ? "badge-ok" : "badge-full"}">${
            s.disponibles > 0 ? s.disponibles + " cupos" : "Completo"
          }</span>`
        : "";

      return `
        <div class="result-card${isSelected ? " selected" : ""}${isFull ? " full" : ""}" role="listitem">
          <div class="result-main">
            <div class="result-title">
              <span class="result-code">${s.clave}</span>
              <span class="result-sec">Sec ${s.seccion}</span>
              ${availBadge}
            </div>
            <div class="result-name">${s.nombre}</div>
            <div class="result-details">
              <span>👤 ${s.profesor || "—"}</span>
              <span>🕐 ${horarioStr}</span>
              <span>📍 ${s.aula || s.campus}</span>
              ${s.creditos ? `<span>⭐ ${s.creditos} cr.</span>` : ""}
            </div>
          </div>
          <button
            class="btn-add${isSelected ? " btn-added" : ""}"
            data-id="${s.id}"
            aria-label="${isSelected ? "Quitar" : "Agregar"} ${s.clave} sección ${s.seccion}"
            title="${isSelected ? "Quitar del horario" : "Agregar al horario"}"
          >${isSelected ? "✓" : "+"}</button>
        </div>`;
    })
    .join("");

  container.querySelectorAll(".btn-add").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const section = results.find((s) => s.id === btn.dataset.id);
      if (section) toggleSection(section);
    });
  });
}

// ---- Gestión del horario ----
function toggleSection(section) {
  if (selectedMap.has(section.id)) {
    removeSection(section.id);
    return;
  }

  const conflicts = [...selectedMap.values()].filter((s) => sectionsConflict(section, s));
  if (conflicts.length > 0) {
    showConflictModal(section, conflicts);
    return;
  }

  addSection(section);
}

function addSection(section) {
  selectedMap.set(section.id, section);
  saveToStorage();
  buildGrid();
  renderSelectedList();
  renderResults();
  showToast(`${section.clave} Sec ${section.seccion} agregada ✓`, "success");
}

function removeSection(id) {
  const section = selectedMap.get(id);
  selectedMap.delete(id);
  saveToStorage();
  buildGrid();
  renderSelectedList();
  renderResults();
  if (section) showToast(`${section.clave} Sec ${section.seccion} quitada`, "info");
}

// ---- Modal de conflicto ----
function showConflictModal(section, conflicts) {
  pendingAdd = section;
  const names = conflicts.map((s) => `${s.clave} Sec ${s.seccion}`).join(", ");
  document.getElementById("modal-text").textContent =
    `"${section.clave} Sec ${section.seccion}" choca con: ${names}. ¿Agregar de todas formas?`;
  document.getElementById("modal-overlay").classList.remove("hidden");
}

function closeModal() {
  pendingAdd = null;
  document.getElementById("modal-overlay").classList.add("hidden");
}

// ---- Grilla semanal ----
function buildGrid() {
  if (gridBuilt) {
    renderCourseBlocks();
    return;
  }

  const grid       = document.getElementById("schedule-grid");
  const totalSlots = (GRID_END_H - GRID_START_H) * (60 / SLOT_MIN);
  const cols       = DAYS.length;

  grid.style.gridTemplateColumns = `56px repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows   = `36px ${Array(totalSlots).fill("28px").join(" ")}`;
  grid.innerHTML = "";

  // Esquina superior izquierda
  grid.insertAdjacentHTML("beforeend", '<div class="g-corner"></div>');

  // Encabezados de días
  DAYS.forEach((d) => {
    grid.insertAdjacentHTML(
      "beforeend",
      `<div class="g-day-head">${DAY_LABELS[d].substring(0, 3)}</div>`
    );
  });

  // Filas de tiempo
  for (let i = 0; i < totalSlots; i++) {
    const totalMin = GRID_START_H * 60 + i * SLOT_MIN;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    grid.insertAdjacentHTML(
      "beforeend",
      `<div class="g-time">${m === 0 ? `${h}:00` : ""}</div>`
    );
    DAYS.forEach((d) => {
      grid.insertAdjacentHTML(
        "beforeend",
        `<div class="g-slot" data-day="${d}" data-row="${i + 2}"></div>`
      );
    });
  }

  gridBuilt = true;
  renderCourseBlocks();
}

function timeToRow(timeStr) {
  const min = toMin(timeStr) - GRID_START_H * 60;
  return Math.max(1, Math.floor(min / SLOT_MIN)) + 2; // +2: header row + 1-indexed
}

function renderCourseBlocks() {
  const grid = document.getElementById("schedule-grid");
  grid.querySelectorAll(".course-block").forEach((el) => el.remove());

  for (const section of selectedMap.values()) {
    if (!section.horario) continue;
    const { dias, inicio, fin } = section.horario;
    const rowStart = timeToRow(inicio);
    const rowEnd   = timeToRow(fin);
    const color    = getColor(section.clave);

    dias.forEach((day) => {
      const col = DAYS.indexOf(day);
      if (col === -1) return;

      const block = document.createElement("div");
      block.className = "course-block";
      block.style.cssText = [
        `grid-column: ${col + 2}`,
        `grid-row: ${rowStart} / ${rowEnd}`,
        `--cc: ${color}`,
      ].join(";");
      block.innerHTML = `
        <div class="cb-inner">
          <div class="cb-code">${section.clave}</div>
          <div class="cb-sec">Sec ${section.seccion}</div>
          <div class="cb-time">${inicio}–${fin}</div>
        </div>
        <button class="cb-remove" data-id="${section.id}" title="Quitar" aria-label="Quitar ${section.clave}">×</button>`;
      grid.appendChild(block);
    });
  }
}

// Delegar clic en los botones de quitar dentro de la grilla
function onGridClick(e) {
  const btn = e.target.closest(".cb-remove");
  if (btn) removeSection(btn.dataset.id);
}

// ---- Lista de seleccionados ----
function renderSelectedList() {
  const container = document.getElementById("selected-list");
  const sections  = [...selectedMap.values()];
  const credits   = sections.reduce((sum, s) => sum + (s.creditos || 0), 0);

  document.getElementById("credits-badge").textContent =
    credits > 0 ? `${credits} créditos` : "";

  if (sections.length === 0) {
    container.innerHTML = '<p class="empty-hint">Agrega asignaturas desde el buscador →</p>';
    return;
  }

  container.innerHTML = sections
    .map((s) => {
      const hStr = s.horario
        ? `${s.horario.dias.join("")} ${s.horario.inicio}–${s.horario.fin}`
        : s.horario_raw || "—";
      const color = getColor(s.clave);
      return `
        <div class="sel-card">
          <span class="sel-dot" style="background:${color}"></span>
          <div class="sel-info">
            <strong>${s.clave}</strong> Sec ${s.seccion}
            <span class="sel-meta">${s.nombre} · ${hStr} · ${s.campus}</span>
          </div>
          <button class="btn-sel-rm" data-id="${s.id}" title="Quitar" aria-label="Quitar ${s.clave}">✕</button>
        </div>`;
    })
    .join("");

  container.querySelectorAll(".btn-sel-rm").forEach((btn) => {
    btn.addEventListener("click", () => removeSection(btn.dataset.id));
  });
}

// ---- Persistencia ----
function saveToStorage() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...selectedMap.entries()]));
  } catch (_) {}
}

function restoreFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    for (const [id, section] of JSON.parse(raw)) {
      selectedMap.set(id, section);
    }
  } catch (e) {
    console.warn("No se pudo restaurar el horario guardado:", e);
  }
}

// ---- Inicialización ----
function init() {
  let searchTimer;

  document.getElementById("search-input").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderResults, 150);
  });

  document.getElementById("campus-filter").addEventListener("change", renderResults);
  document.getElementById("available-only").addEventListener("change", renderResults);

  document.getElementById("schedule-grid").addEventListener("click", onGridClick);

  document.getElementById("btn-clear").addEventListener("click", () => {
    if (selectedMap.size === 0) return;
    if (!confirm("¿Limpiar todo el horario?")) return;
    selectedMap.clear();
    colorMap.clear();
    colorIdx = 0;
    saveToStorage();
    renderCourseBlocks();
    renderSelectedList();
    renderResults();
  });

  document.getElementById("btn-print").addEventListener("click", () => window.print());

  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-confirm").addEventListener("click", () => {
    if (pendingAdd) {
      const s = pendingAdd;
      closeModal();
      addSection(s);
    }
  });
  document.getElementById("modal-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  loadData();
}

document.addEventListener("DOMContentLoaded", init);
