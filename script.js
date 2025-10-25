/* ==========================================================
   Google Sheets (GViz JSON)
========================================================== */

async function fetchGviz(sheetName) {
  const SHEET_ID = window.GSHEET_ID;
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const json = JSON.parse(text.substring(47).slice(0, -2));
  return json.table;
}

function gvizToObjects(table) {
  const headers = table.cols.map(c => (c?.label || "").trim());
  const rows = table.rows
    .map(r => (r.c || []).map(cell => (cell && cell.v != null ? String(cell.v) : "")))
    .filter(row => row.some(v => v !== ""));
  const maybeHeader = rows[0] || [];
  const sameHeader = maybeHeader.every((v, i) =>
    headers[i] ? v.trim().toLowerCase() === headers[i].trim().toLowerCase() : false
  );
  const data = sameHeader ? rows.slice(1) : rows;

  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => (obj[h || `col_${i}`] = row[i] || ""));
    return obj;
  });
}

let professionsCache = null;
let groupsCache = null;

async function getProfessions() {
  if (professionsCache) return professionsCache;
  const table = await fetchGviz(window.SHEET_PROFESSIONS || "Профессии");
  professionsCache = gvizToObjects(table);
  return professionsCache;
}
async function getGroups() {
  if (groupsCache) return groupsCache;
  const table = await fetchGviz(window.SHEET_GROUPS || "Группы");
  groupsCache = gvizToObjects(table).map(g => ({
    id: String(g["ID группы"] || g["ID"] || "").trim(),
    name: (g["Название группы"] || g["Название"] || "").trim(),
    desc: (g["Описание"] || "").trim()
  }));
  return groupsCache;
}

function safe(t) {
  return String(t || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

/* ==========================================================
   Главная: рендер групп
========================================================== */
async function renderGroups() {
  const wrap = document.querySelector(".groups");
  if (!wrap) return;

  wrap.innerHTML = `<div class="groups-loader">Загружаем группы…</div>`;

  try {
    const table = await fetchGviz(window.SHEET_GROUPS || "Группы");
    const groups = gvizToObjects(table);
    wrap.innerHTML = "";

    groups.forEach(g => {
      const id = g["ID группы"] || g["ID"] || "";
      const title = g["Название группы"] || g["Название"] || "Без названия";
      const desc = g["Описание"] || "";

      const card = document.createElement("div");
      card.className = "group-card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-expanded", "false");
      card.dataset.groupId = id;

      card.innerHTML = `
        <h3>${safe(title)}</h3>
        ${desc ? `<p>${safe(desc)}</p>` : ""}
      `;

      const smoothScrollToCard = () => {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        const block = isMobile ? "start" : "center";

        card.scrollIntoView({
          behavior: prefersReducedMotion ? "instant" : "smooth",
          block,
          inline: "nearest"
        });

        if (prefersReducedMotion) return Promise.resolve();

        return new Promise(resolve => {
          let lastY = window.scrollY;
          let stableFrames = 0;
          let totalFrames = 0;
          const maxFrames = 45; // ~750ms at 60fps
          let done = false;
          const check = () => {
            if (done) return;
            totalFrames += 1;
            const currentY = window.scrollY;
            if (Math.abs(currentY - lastY) < 1) {
              stableFrames += 1;
            } else {
              stableFrames = 0;
              lastY = currentY;
            }

            if (stableFrames > 5 || totalFrames >= maxFrames) {
              done = true;
              resolve();
              return;
            }
            requestAnimationFrame(check);
          };

          requestAnimationFrame(check);
        });
      };

      const toggle = async () => {
        const expanded = card.classList.toggle("expanded");
        card.setAttribute("aria-expanded", expanded ? "true" : "false");

        const exists = card.querySelector(".prof-list");
        if (!expanded && exists) { exists.remove(); return; }

        if (expanded && !exists) {
          await smoothScrollToCard();
          const list = document.createElement("div");
          list.className = "prof-list";
          list.innerHTML = `<div class="groups-loader">Загружаем профессии…</div>`;
          card.appendChild(list);

          const all = await getProfessions();
          const items = all.filter(p => String(p["Группа (ID)"]) === String(id));

          const clip = (t, n = 140) => (t || "").length > n ? (t || "").slice(0, n).trim() + "…" : (t || "");

          list.innerHTML = "";
          items.forEach((p, i) => {
            const pid = p["ID"] || "";
            const name = p["Название профессии"] || "Профессия";
            const short = clip(p["Описание"] || p["Краткое описание"] || "");
            const link = `profession.html?id=${encodeURIComponent(pid)}`;

            const item = document.createElement("div");
            item.className = "prof-card";
            item.style.animation = `fadeIn 0.4s ease ${i * 0.05}s both`;
            item.innerHTML = `
              <h4>${safe(name)}</h4>
              ${short ? `<p>${safe(short)}</p>` : `<p>Описание будет добавлено.</p>`}
              <a class="btn" href="${link}">Подробнее</a>
            `;
            list.appendChild(item);
          });

          if (!items.length) {
            list.innerHTML = `<div class="groups-loader" style="opacity:.8">
              Пока нет данных по профессиям этой группы.
            </div>`;
          }
        } else if (expanded) {
          await smoothScrollToCard();
        }
      };

      card.addEventListener("click", toggle);
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });

      wrap.appendChild(card);
    });
  } catch (e) {
    console.error("Ошибка загрузки групп:", e);
    wrap.innerHTML = `<div class="groups-loader" style="color:#b00020">
      Не удалось загрузить группы. Проверьте доступ к таблице (режим: «читатель»).
    </div>`;
  }
}

/* Плавная прокрутка по якорям */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const t = document.querySelector(this.getAttribute("href"));
    if (t) t.scrollIntoView({ behavior: "smooth" });
  });
});

/* Кнопка «наверх» */
function initToTop() {
  const btn = document.getElementById("toTop");
  if (!btn) return;

  const toggle = () => {
    if (window.scrollY > 300) btn.classList.add("to-top--visible");
    else btn.classList.remove("to-top--visible");
  };
  toggle();

  window.addEventListener("scroll", toggle, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function initMobileMenu() {
  const header = document.querySelector("header");
  if (!header) return;

  const toggle = header.querySelector(".menu-toggle");
  const nav = header.querySelector("nav");
  if (!toggle || !nav) return;

  header.classList.add("menu-ready");

  const closeMenu = () => {
    header.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Открыть меню");
  };

  const openMenu = () => {
    header.classList.add("menu-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Закрыть меню");
  };

  closeMenu();

  toggle.addEventListener("click", () => {
    if (header.classList.contains("menu-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));

  document.addEventListener("click", event => {
    if (!header.classList.contains("menu-open")) return;
    if (!header.contains(event.target)) {
      closeMenu();
    }
  });

  const mq = window.matchMedia("(min-width: 769px)");
  const syncMenu = e => {
    if (e.matches) {
      closeMenu();
    }
  };
  if (typeof mq.addEventListener === "function") mq.addEventListener("change", syncMenu);
  else if (typeof mq.addListener === "function") mq.addListener(syncMenu);

  syncMenu(mq);
}

/* Инициализация главной */
document.addEventListener("DOMContentLoaded", () => {
  renderGroups();
  initToTop();
  initMobileMenu();
});

/* Анимация появления */
const style = document.createElement("style");
style.textContent = `
@keyframes fadeIn {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}`;
document.head.appendChild(style);

/* ==========================================================
   Страница профессии (#profession)
========================================================== */
async function loadProfessionPage() {
  const root = document.getElementById("profession");
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const profId = params.get("id");
  if (!profId) { root.innerHTML = `<p class="error">Не указана профессия.</p>`; return; }

  try {
    const [allProf, allGroups] = await Promise.all([getProfessions(), getGroups()]);
    const prof = allProf.find(p => String(p["ID"]) === String(profId));
    if (!prof) { root.innerHTML = `<p class="error">Профессия не найдена.</p>`; return; }

    const groupId = String(prof["Группа (ID)"] || "").trim();
    const group = allGroups.find(g => g.id === groupId);
    const groupName = group ? group.name : "Группа не найдена";

    const title = safe(prof["Название профессии"]);
    const short = safe(prof["Описание"]);
    const about = safe(prof["Общее описание"]);
    const roles = safe(prof["Примеры ролей и трудовых функций"]);
    const skills = safe(prof["Ключевые компетенции / навыки"]);
    const recs  = safe(prof["Рекомендации"]);

    root.innerHTML = `
      <main class="profession-page">
        <article class="profession-card glass" id="prof-card">
          <header class="prof-header">
            <h1 class="prof-title">${title}</h1>
            <p class="prof-group-name">${safe(groupName)}</p>
          </header>

          <section class="prof-section">
            <h2>Описание</h2>
            ${(() => {
              const blocks = [];
              if (short) blocks.push(`<p class="prof-short">${short}</p>`);
              if (about) blocks.push(`<p>${about}</p>`);
              if (!blocks.length) blocks.push(`<p>—</p>`);
              return blocks.join("");
            })()}
          </section>

          <section class="prof-section">
            <h2>Примеры ролей и трудовых функций</h2>
            <p>${roles || "—"}</p>
          </section>

          <section class="prof-section">
            <h2>Ключевые компетенции / навыки</h2>
            <p>${skills || "—"}</p>
          </section>

          ${recs ? `
          <aside class="prof-recommend">
            <div class="rec-title">Рекомендации</div>
            <div class="rec-body">${recs}</div>
          </aside>` : ``}

          <div class="prof-nav">
            <a class="btn" href="index.html#groups">← К списку групп</a>
          </div>
        </article>
      </main>
    `;

    const card = document.getElementById("prof-card");
    card.classList.add("appear");
    setTimeout(() => card.classList.remove("appear"), 600);
    setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "start" }), 120);

  } catch (err) {
    console.error(err);
    root.innerHTML = `<p class="error">Ошибка загрузки данных. Проверьте доступ к таблице.</p>`;
  }
}

// Функции для работы с Google Sheets
async function fetchGviz(sheetName) {
  const SHEET_ID = window.GSHEET_TEST_ID;
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const json = JSON.parse(text.substring(47).slice(0, -2)); // убираем оболочку
  return json.table; // { cols:[], rows:[] }
}

function gvizToObjects(table) {
  const headers = table.cols.map(c => (c?.label || "").trim());
  const rows = table.rows
    .map(r => (r.c || []).map(cell => (cell && cell.v != null ? String(cell.v) : "")))
    .filter(row => row.some(v => v !== "")); // убираем пустые строки
  const maybeHeader = rows[0] || [];
  const sameHeader = maybeHeader.every((v, i) =>
    headers[i] ? v.trim().toLowerCase() === headers[i].trim().toLowerCase() : false
  );
  const data = sameHeader ? rows.slice(1) : rows;
  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => (obj[h || `col_${i}`] = row[i] || ""));
    return obj;
  });
}

// Кэш для профессий
let professionsCache = null;
async function getProfessions() {
  if (professionsCache) return professionsCache;
  const table = await fetchGviz(window.SHEET_TEST_RESULTS || "Результаты");
  professionsCache = gvizToObjects(table);
  return professionsCache;
}

// Функция для рендера вопросов теста
async function loadTestPage() {
  const root = document.getElementById("test-root");
  if (!root) return;

  const resultsWrap = document.getElementById("test-results");
  const SHEET_Q = window.SHEET_TEST_QUESTIONS || "Вопросы";
  const SHEET_R = window.SHEET_TEST_RESULTS || "Результаты";

  root.innerHTML = `<div class="test-loader">Загружаем вопросы…</div>`;

  try {
    // Загружаем вопросы и результаты
    const [tblQ, tblR] = await Promise.all([
      fetchGviz(SHEET_Q),
      fetchGviz(SHEET_R),
    ]);
    const rowsQ = gvizToObjects(tblQ);
    const rowsR = gvizToObjects(tblR);

    // Форматируем вопросы
    const questions = rowsQ.map((r, idx) => {
      const qText = r["Вопрос"] || r["Текст"] || r["Question"] || `Вопрос ${idx + 1}`;
      const options = [];
      Object.keys(r).forEach((k) => {
        const m = k.match(/^Вариант\s*(\d+)$/i);
        if (!m) return;
        const n = m[1];
        const text = (r[k] || "").trim();
        const key = (r[`Ключ ${n}`] || r[`Key ${n}`] || "").trim();
        if (text && key) options.push({ text, key });
      });
      return { id: r["ID"] || r["№"] || String(idx + 1), text: qText, options };
    }).filter(q => q.options.length);

    if (!questions.length) {
      root.innerHTML = `<div class="test-loader">В таблице нет валидных вопросов.</div>`;
      return;
    }

    // Индексы для результатов: ключ -> массив ID профессий
    const keyToProfIds = {};
    rowsR.forEach((r) => {
      const key = (r["Ключ"] || r["Key"] || "").trim();
      if (!key) return;
      const byIds = (r["Профессии (ID)"] || r["IDs"] || "").split(/[,\s]+/).filter(Boolean);
      keyToProfIds[key] = { byIds };
    });

    let current = 0;
    const answers = []; // [{qid, key}]
    renderShell();
    renderQuestion();

    // Рендерим оболочку
    function renderShell() {
      root.innerHTML = `
        <div class="test-progress">
          <div>Шаг <span id="t-step">1</span> из <span id="t-total">${questions.length}</span></div>
          <div class="test-bar"><span id="t-bar"></span></div>
        </div>
        <div class="q-card">
          <div id="t-title" class="q-title"></div>
          <div id="t-options" class="q-options"></div>
        </div>
        <div class="test-actions">
          <button class="btn" id="t-prev" disabled>Назад</button>
          <div style="flex:1"></div>
          <button class="btn" id="t-next" disabled>Далее</button>
          <button class="btn" id="t-finish" style="display:none" disabled>Показать результат</button>
        </div>
      `;
      // Привязываем элементы на странице
      const ui = {};
      ui.step = root.querySelector("#t-step");
      ui.total = root.querySelector("#t-total");
      ui.bar = root.querySelector("#t-bar");
      ui.title = root.querySelector("#t-title");
      ui.opts = root.querySelector("#t-options");
      ui.prev = root.querySelector("#t-prev");
      ui.next = root.querySelector("#t-next");
      ui.finish = root.querySelector("#t-finish");

      ui.prev.addEventListener("click", () => { current = Math.max(0, current - 1); renderQuestion(); });
      ui.next.addEventListener("click", () => { current = Math.min(questions.length - 1, current + 1); renderQuestion(); });
      ui.finish.addEventListener("click", showResults);
    }

    function renderQuestion() {
      const q = questions[current];
      ui.step.textContent = String(current + 1);
      ui.title.textContent = q.text;
      ui.bar.style.width = `${Math.round((current) /
