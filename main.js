
/* ========= Config ========= */

const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const SOLUTIONS = [
  "AI Business Solutions",
  "Cloud and AI Platforms",
  "Security",
  "All CSAs",
];

function solutionToCssVar(solution){
  switch(solution){
    case "AI Business Solutions": return "var(--sol-ai-business)";
    case "Cloud and AI Platforms": return "var(--sol-cloud-ai)";
    case "Security": return "var(--sol-security)";
    case "All CSAs": return "var(--sol-all-csas)";
    default: return "var(--muted-foreground)";
  }
}

/* ========= State ========= */
let allEvents = [];
let activeFilters = new Set(SOLUTIONS); // default all on
let currentDate = new Date(); // month shown

/* ========= DOM ========= */
const gridEl = document.getElementById("calendarGrid");
const monthTitleEl = document.getElementById("monthTitle");
const filterBarEl = document.getElementById("filterBar");

const prevBtn = document.getElementById("prevMonthBtn");
const nextBtn = document.getElementById("nextMonthBtn");
const todayBtn = document.getElementById("todayBtn");
const reloadBtn = document.getElementById("reloadBtn");

/* Modal DOM */
const modalBackdrop = document.getElementById("modalBackdrop");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalTitle = document.getElementById("modalTitle");
const modalSolutionPill = document.getElementById("modalSolutionPill");
const modalDate = document.getElementById("modalDate");
const modalLocation = document.getElementById("modalLocation");
const modalRegRow = document.getElementById("modalRegRow");
const modalVivaRow = document.getElementById("modalVivaRow");
const modalRegLink = document.getElementById("modalRegLink");
const modalVivaLink = document.getElementById("modalVivaLink");

/* ========= Utilities ========= */

function pad2(n){ return String(n).padStart(2,"0"); }

function formatMonthTitle(date){
  // ex) 2025년 12월
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return `${y}년 ${m}월`;
}

function parseISODate(dateStr){
  // "YYYY-MM-DD" → Date at local midnight (KST environment assumed by user)
  const [y,m,d] = dateStr.split("-").map(Number);
  return new Date(y, m-1, d, 0,0,0,0);
}

function toISODateOnly(date){
  return `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;
}

function isSameDay(a,b){
  return a.getFullYear()===b.getFullYear() &&
         a.getMonth()===b.getMonth() &&
         a.getDate()===b.getDate();
}

function clampEndDate(ev){
  return ev.endDate ? ev.endDate : ev.startDate;
}

function isDateInRange(dateISO, startISO, endISO){
  return dateISO >= startISO && dateISO <= endISO;
}

function getEventPosition(dateISO, startISO, endISO){
  if(startISO === endISO) return "single";
  if(dateISO === startISO) return "start";
  if(dateISO === endISO) return "end";
  return "middle";
}

function formatDateRangeKorean(startISO, endISO){
  const s = parseISODate(startISO);
  const e = parseISODate(endISO);
  const sTxt = `${s.getFullYear()}년 ${s.getMonth()+1}월 ${s.getDate()}일`;
  const eTxt = `${e.getFullYear()}년 ${e.getMonth()+1}월 ${e.getDate()}일`;
  return (startISO === endISO) ? sTxt : `${sTxt} ~ ${eTxt}`;
}

/* ========= Calendar grid generation ========= */

function getCalendarGrid(year, monthIndex){
  // monthIndex: 0-11
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);

  // start from Sunday of first week
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  // end at Saturday of last week
  const end = new Date(last);
  end.setDate(last.getDate() + (6 - last.getDay()));

  const days = [];
  const cur = new Date(start);
  while(cur <= end){
    days.push({
      date: new Date(cur),
      iso: toISODateOnly(cur),
      isCurrentMonth: cur.getMonth() === monthIndex
    });
    cur.setDate(cur.getDate() + 1);
  }
  return days; // flat list length 28~42
}

/* ========= Rendering ========= */

function filteredEvents(){
  return allEvents.filter(ev => activeFilters.has(ev.solution));
}

function renderFilters(){
  filterBarEl.innerHTML = "";

  SOLUTIONS.forEach(sol => {
    const btn = document.createElement("button");
    btn.className = "filter-pill";
    btn.textContent = sol;

    const active = activeFilters.has(sol);
    if(active){
      btn.classList.add("active");
      btn.style.background = solutionToCssVar(sol);
    }

    btn.addEventListener("click", () => {
      if(activeFilters.has(sol)) activeFilters.delete(sol);
      else activeFilters.add(sol);

      // if none selected, revert to all (safety)
      if(activeFilters.size === 0){
        activeFilters = new Set(SOLUTIONS);
      }
      render();
    });

    filterBarEl.appendChild(btn);
  });
}

function render(){
  monthTitleEl.textContent = formatMonthTitle(currentDate);

  renderFilters();

  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();
  const gridDays = getCalendarGrid(year, monthIndex);

  // Pre-index events by date for quick mapping
  const evs = filteredEvents().map(ev => ({
    ...ev,
    endDate: clampEndDate(ev)
  }));

  gridEl.innerHTML = "";

  for(const day of gridDays){
    const cell = document.createElement("div");
    cell.className = "day" + (day.isCurrentMonth ? "" : " other-month");

    const num = document.createElement("div");
    num.className = "day-number";
    num.textContent = String(day.date.getDate());
    cell.appendChild(num);

    const stack = document.createElement("div");
    stack.className = "events";

    // events on this date
    const onDay = evs
      .filter(ev => isDateInRange(day.iso, ev.startDate, ev.endDate))
      // stable order: start first, then others
      .sort((a,b) => (a.startDate > b.startDate ? 1 : -1));

    onDay.forEach(ev => {
      const pos = getEventPosition(day.iso, ev.startDate, ev.endDate);

      if(pos === "single" || pos === "start"){
        stack.appendChild(createFullEventCard(ev));
      } else {
        stack.appendChild(createContinuationCard(ev));
      }
    });

    cell.appendChild(stack);
    gridEl.appendChild(cell);
  }
}

function createFullEventCard(ev){
  const card = document.createElement("div");
  card.className = "event-card";
  const color = solutionToCssVar(ev.solution);
  card.style.borderLeftColor = color;

  // Title
  const title = document.createElement("div");
  title.className = "event-title";
  title.textContent = ev.title || "(No title)";
  card.appendChild(title);

  // Location
  const loc = document.createElement("div");
  loc.className = "event-location";
  loc.innerHTML = `<i class="ph-fill ph-map-pin"></i><span class="truncate">${ev.location || ""}</span>`;
  card.appendChild(loc);

  // Links
  const links = document.createElement("div");
  links.className = "event-links";

  let hasAny = false;

  if(ev.registrationUrl){
    hasAny = true;
    const a = document.createElement("a");
    a.href = ev.registrationUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML = `<i class="ph-bold ph-link"></i><span>Reg</span>`;
    a.addEventListener("click", (e) => e.stopPropagation());
    links.appendChild(a);
  }

  if(ev.vivaEngageUrl){
    hasAny = true;
    const a = document.createElement("a");
    a.href = ev.vivaEngageUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML = `<i class="ph-bold ph-link"></i><span>Viva</span>`;
    a.addEventListener("click", (e) => e.stopPropagation());
    links.appendChild(a);
  }

  if(hasAny) card.appendChild(links);

  // Click → open modal
  card.addEventListener("click", () => openModal(ev));

  return card;
}

function createContinuationCard(ev){
  const card = document.createElement("div");
  card.className = "cont-card";
  const color = solutionToCssVar(ev.solution);
  card.style.borderLeftColor = color;

  const arrow = document.createElement("i");
  arrow.className = "ph-bold ph-arrow-right";
  arrow.style.color = color;

  const t = document.createElement("div");
  t.className = "cont-title";
  t.textContent = ev.title || "(No title)";
  t.style.color = color;

  card.appendChild(arrow);
  card.appendChild(t);

  card.addEventListener("click", () => openModal(ev));
  return card;
}

/* ========= Modal ========= */

function openModal(ev){
  const end = clampEndDate(ev);
  modalTitle.textContent = ev.title || "";
  modalSolutionPill.textContent = ev.solution || "";
  modalSolutionPill.style.background = solutionToCssVar(ev.solution);

  modalDate.textContent = formatDateRangeKorean(ev.startDate, end);
  modalLocation.textContent = ev.location || "—";

  // Registration
  if(ev.registrationUrl){
    modalRegRow.classList.remove("hidden");
    modalRegLink.textContent = ev.registrationUrl;
    modalRegLink.href = ev.registrationUrl;
  } else {
    modalRegRow.classList.add("hidden");
  }

  // Viva
  if(ev.vivaEngageUrl){
    modalVivaRow.classList.remove("hidden");
    modalVivaLink.textContent = ev.vivaEngageUrl;
    modalVivaLink.href = ev.vivaEngageUrl;
  } else {
    modalVivaRow.classList.add("hidden");
  }

  modalBackdrop.classList.remove("hidden");

  // focus
  modalCloseBtn.focus();
}

function closeModal(){
  modalBackdrop.classList.add("hidden");
}

modalCloseBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  // click outside closes
  if(e.target === modalBackdrop) closeModal();
});
window.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && !modalBackdrop.classList.contains("hidden")){
    closeModal();
  }
});

/* ========= Navigation ========= */

prevBtn.addEventListener("click", () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth()-1, 1);
  render();
});

nextBtn.addEventListener("click", () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 1);
  render();
});

todayBtn.addEventListener("click", () => {
  const now = new Date();
  currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
  render();
});

reloadBtn.addEventListener("click", async () => {
  await loadEvents();
  render();
});

/* ========= Load events.json ========= */

async function loadEvents(){
  const res = await fetch("./marketing-events.json", { cache: "no-store" });
  if(!res.ok) throw new Error("Failed to load events.json");
  const data = await res.json();

  // normalize
  allEvents = (Array.isArray(data) ? data : []).map(ev => ({
    id: ev.id ?? cryptoRandomId(),
    title: ev.title ?? "",
    solution: ev.solution ?? "AI Business Solutions",
    startDate: ev.startDate ?? "",
    endDate: ev.endDate ?? undefined,
    time: ev.time ?? "",
    location: ev.location ?? "",
    registrationUrl: ev.registrationUrl ?? "",
    vivaEngageUrl: ev.vivaEngageUrl ?? ""
  }));
}

function cryptoRandomId(){
  if(window.crypto?.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(16).slice(2);
}

/* ========= Init ========= */
(async function init(){
  try{
    await loadEvents();
  }catch(err){
    console.error(err);
    allEvents = [];
  }
  // show month as first day of current month
  const now = new Date();
  currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
  render();
})();
