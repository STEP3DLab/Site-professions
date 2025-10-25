/* ==========================================================
   Общие утилиты для Google Sheets (GViz)
========================================================== */

async function fetchGvizFrom(sheetId, sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const json = JSON.parse(text.substring(47).slice(0, -2));
  return json.table;
}

async function fetchGviz(sheetName) {
  const SHEET_ID = window.GSHEET_ID;
  return fetchGvizFrom(SHEET_ID, sheetName);
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

/* маленький helper — экранирование */
function safe(t) {
  return String(t || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

/* ==========================================================
   КЭШ данных каталога (группы/профессии)
========================================================== */
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

/* ==========================================================
   Главная: рендер групп и карточек профессий
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

      const toggle = async () => {
        const expanded = card.classList.toggle("expanded");
        card.setAttribute("aria-expanded", expanded ? "true" : "false");

        const exists = card.querySelector(".prof-list");
        if (!expanded && exists) { exists.remove(); return; }

        if (expanded && !exists) {
          const list = document.createElement("div");
          list.className = "prof-list";
          list.innerHTML = `<div class="groups-loader">Загружаем профессии…</div>`;
          card.appendChild(list);

          const all = await getProfessions();
          const items = all.filter(p => String(p["Группа (ID)"]) === String(id));

          const clip = (t, n=140) => (t||"").length>n ? (t||"").slice(0,n).trim()+"…" : (t||"");

          list.innerHTML = "";
          items.forEach((p,i) => {
            const pid   = p["ID"] || "";
            const name  = p["Название профессии"] || "Профессия";
            const short = clip(p["Описание"] || p["Краткое описание"] || "");
            const link  = `profession.html?id=${encodeURIComponent(pid)}`;

            const item = document.createElement("div");
            item.className = "prof-card";
            item.style.animation = `fadeIn .35s ease ${i*0.05}s both`;
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

          // прокрутка — центрируем карточку в окне
          setTimeout(() => {
            const rect = card.getBoundingClientRect();
            const targetY = window.scrollY + rect.top - window.innerHeight/2 + rect.height/2;
            window.scrollTo({ top: targetY, behavior: "smooth" });
          }, 250);
        }
      };

      card.addEventListener("click", toggle);
      card.addEventListener("keydown", e => {
        if (e.key==="Enter" || e.key===" ") { e.preventDefault(); toggle(); }
      });

      wrap.appendChild(card);
    });
  } catch (e) {
    console.error(e);
    wrap.innerHTML = `<div class="groups-loader" style="color:#b00020">
      Не удалось загрузить группы. Проверьте доступ к таблице (режим «читатель»).
    </div>`;
  }
}

/* Простая анимация появления карточек */
const animStyle = document.createElement("style");
animStyle.textContent = `
@keyframes fadeIn { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:none} }
`;
document.head.appendChild(animStyle);

/* ==========================================================
   Страница профессии
========================================================== */

async function loadProfessionPage() {
  const root = document.getElementById("profession");
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const profId = params.get("id");
  if (!profId) { root.innerHTML = `<p class="error">Не указана профессия.</p>`; return; }

  try {
    const [allProf, allGroups] = await Promise.all([getProfessions(), getGroups()]);
    const prof = allProf.find(p => String(p["ID"])===String(profId));
    if (!prof) { root.innerHTML = `<p class="error">Профессия не найдена.</p>`; return; }

    const groupId   = String(prof["Группа (ID)"] || "").trim();
    const group     = allGroups.find(g => g.id===groupId);
    const groupName = group ? group.name : "Группа не найдена";

    const title = safe(prof["Название профессии"]);
    const short = safe(prof["Описание"]);

    const about = safe(prof["Общее описание"]);
    const roles = safe(prof["Примеры ролей и трудовых функций"]);
    const skills= safe(prof["Ключевые компетенции / навыки"]);
    const recs  = safe(prof["Рекомендации"]);

    root.innerHTML = `
      <article class="profession-page">
        <div class="profession-card glass appear">

          <header class="prof-header">
            <h1 class="prof-title">${title}</h1>
            <div class="prof-group">
              <span class="group-chip">Группа</span>
              <span class="group-name">${safe(groupName)}</span>
            </div>
            ${short ? `<p class="prof-short">${short}</p>` : ``}
          </header>

          <section class="prof-section">
            <h2>Общее описание</h2>
            <p>${about || "—"}</p>
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
        </div>
      </article>
    `;
  } catch (e) {
    console.error(e);
    root.innerHTML = `<p class="error">Ошибка загрузки данных.</p>`;
  }
}

/* ==========================================================
   Тест: загрузка вопросов, ответы и результаты
========================================================== */

/**
 * Ожидаемая структура листов:
 * 1) Лист "Вопросы"
 *    Обязательные столбцы:
 *      - "ID" (можно не заполнять) или "№"
 *      - "Вопрос"   — текст вопроса
 *    Варианты можно задавать ЛЮБЫМ из способов:
 *      - Парами колонок: "Вариант 1", "Ключ 1", "Вариант 2", "Ключ 2", ...
 *      - Одной колонкой с парами через вертикальную черту:  "вариант|Q1"
 *        (несколько пар через ; или перенос строки)
 *
 * 2) Лист "Результаты"
 *    - "Ключ"              — Q-ключ (например, Q1, Q2, ...)
 *    - "Профессии (ID)"    — список ID профессий (через запятую)
 *      (допустимо вместо ID — колонка "Профессии" c названиями)
 */

async function loadTestPage() {
  const root = document.getElementById("test-root");
  if (!root) return;

  const resultsWrap = document.getElementById("test-results");
  const TEST_ID = window.GSHEET_TEST_ID;
  const SHEET_Q  = window.SHEET_TEST_QUESTIONS || "Вопросы";
  const SHEET_R  = window.SHEET_TEST_RESULTS   || "Результаты";

  root.innerHTML = `<div class="test-loader">Загружаем вопросы…</div>`;

  try {
    // загружаем «Вопросы» и «Результаты»
    const [tblQ, tblR] = await Promise.all([
      fetchGvizFrom(TEST_ID, SHEET_Q),
      fetchGvizFrom(TEST_ID, SHEET_R)
    ]);
    const rowsQ = gvizToObjects(tblQ);
    const rowsR = gvizToObjects(tblR);

    // парсинг вопросов в универсальном формате
    const questions = rowsQ.map((r, idx) => {
      const qText = r["Вопрос"] || r["Текст"] || r["Question"] || `Вопрос ${idx+1}`;
      const options = [];

      // 1) пары колонок "Вариант N" + "Ключ N"
      Object.keys(r).forEach(k => {
        const m = k.match(/^Вариант\s*(\d+)$/i);
        if (!m) return;
        const n = m[1];
        const text = (r[k] || "").trim();
        const key  = (r[`Ключ ${n}`] || r[`Key ${n}`] || "").trim();
        if (text && key) options.push({ text, key });
      });

      // 2) одна колонка с парами "вариант|ключ"
      if (!options.length) {
        Object.keys(r).forEach(k => {
          if (/вариант/i.test(k)) {
            const chunk = String(r[k] || "");
            const parts = chunk.split(/[\n;]+/).map(s => s.trim()).filter(Boolean);
            parts.forEach(p => {
              const [text, key] = p.split("|").map(s => (s||"").trim());
              if (text && key) options.push({ text, key });
            });
          }
        });
      }

      return { id: r["ID"] || r["№"] || String(idx+1), text: qText, options };
    }).filter(q => q.options.length);

    if (!questions.length) {
      root.innerHTML = `<div class="test-loader">В таблице пока нет валидных вопросов.</div>`;
      return;
    }

    // индексы результатов: ключ -> массив ID профессий
    const keyToProfIds = {};
    rowsR.forEach(r => {
      const key = (r["Ключ"] || r["Key"] || "").trim();
      if (!key) return;

      const byIds = (r["Профессии (ID)"] || r["IDs"] || "").split(/[, \s]+/).filter(Boolean);
      const byNames = (r["Профессии"] || "").split(/\s*,\s*/).filter(Boolean);

      keyToProfIds[key] = { byIds, byNames };
    });

    // состояние теста
    let current = 0;
    const answers = []; // [{qid, key}]

    // рендер
    const ui = {};
    renderShell();
    renderQuestion();

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
      ui.step = root.querySelector("#t-step");
      ui.total = root.querySelector("#t-total");
      ui.bar  = root.querySelector("#t-bar");
      ui.title= root.querySelector("#t-title");
      ui.opts = root.querySelector("#t-options");
      ui.prev = root.querySelector("#t-prev");
      ui.next = root.querySelector("#t-next");
      ui.finish = root.querySelector("#t-finish");

      ui.prev.addEventListener("click", () => { current = Math.max(0, current-1); renderQuestion(); });
      ui.next.addEventListener("click", () => { current = Math.min(questions.length-1, current+1); renderQuestion(); });
      ui.finish.addEventListener("click", showResults);
    }

    function renderQuestion() {
      const q = questions[current];
      ui.step.textContent = String(current+1);
      ui.title.textContent = q.text;

      // прогресс
      ui.bar.style.width = `${Math.round((current)/questions.length*100)}%`;

      // отрисовка вариантов
      ui.opts.innerHTML = "";
      const saved = answers.find(a => a.qid === q.id)?.key;

      q.options.forEach(opt => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "q-option" + (saved && saved===opt.key ? " selected" : "");
        el.innerHTML = safe(opt.text);
        el.addEventListener("click", () => {
          // сохранить выбор
          const i = answers.findIndex(a => a.qid===q.id);
          if (i>=0) answers.splice(i,1);
          answers.push({ qid:q.id, key: opt.key });

          // подсветка
          ui.opts.querySelectorAll(".q-option").forEach(b => b.classList.remove("selected"));
          el.classList.add("selected");

          ui.next.disabled = current>=questions.length-1 && answers.length<questions.length;
          ui.finish.disabled = answers.length<questions.length;
          ui.next.disabled = false;
          if (current===questions.length-1) ui.finish.disabled = false;
        });
        ui.opts.appendChild(el);
      });

      // состояние кнопок
      ui.prev.disabled = current===0;
      ui.next.style.display   = (current===questions.length-1) ? "none" : "inline-block";
      ui.finish.style.display = (current===questions.length-1) ? "inline-block" : "none";

      // активировать «Далее», если есть ответ
      const hasAnswer = !!answers.find(a => a.qid===q.id);
      ui.next.disabled = (current!==questions.length-1) && !hasAnswer;
      ui.finish.disabled = !(current===questions.length-1 && answers.length===questions.length);
    }

    async function showResults() {
      // финальный прогресс — 100%
      ui.bar.style.width = `100%`;

      // собираем все выбранные ключи
      const chosenKeys = answers.map(a => a.key);

      // из «Результаты»: объединяем все профессии по ключам
      const profs = await getProfessions();

      // сначала собираем по ID
      const byId = new Set();
      const byName = new Set();

      for (const k of chosenKeys) {
        const map = keyToProfIds[k];
        if (!map) continue;
        map.byIds.forEach(id => byId.add(String(id)));
        map.byNames.forEach(n => byName.add(n.toLowerCase()));
      }

      let matched = [];
      if (byId.size) {
        matched = profs.filter(p => byId.has(String(p["ID"])));
      }
      // если ID не указаны — пробуем по названиям
      if (!matched.length && byName.size) {
        matched = profs.filter(p => byName.has(String(p["Название профессии"]||"").toLowerCase()));
      }

      // отображаем
      resultsWrap.innerHTML = `
        <h2>Подходящие варианты</h2>
        <div class="prof-list" id="test-prof-list"></div>
      `;

      const list = document.getElementById("test-prof-list");
      if (!matched.length) {
        list.innerHTML = `<div class="groups-loader" style="opacity:.85">По выбранным ответам рекомендации не найдены. Попробуйте другой набор ответов.</div>`;
        return;
      }

      const clip = (t, n=140) => (t||"").length>n ? (t||"").slice(0,n).trim()+"…" : (t||"");
      matched.forEach((p,i) => {
        const pid   = p["ID"] || "";
        const name  = p["Название профессии"] || "Профессия";
        const short = clip(p["Описание"] || p["Краткое описание"] || "");
        const link  = `profession.html?id=${encodeURIComponent(pid)}`;

        const card = document.createElement("div");
        card.className = "prof-card";
        card.style.animation = `fadeIn .35s ease ${i*0.05}s both`;
        card.innerHTML = `
          <h4>${safe(name)}</h4>
          ${short ? `<p>${safe(short)}</p>` : `<p>Описание будет добавлено.</p>`}
          <a class="btn" href="${link}">Подробнее</a>
        `;
        list.appendChild(card);
      });

      // скроллим к результатам
      resultsWrap.scrollIntoView({ behavior:"smooth", block:"start" });
    }

  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="test-loader" style="color:#b00020">Не удалось загрузить тест. Проверьте доступ к таблице.</div>`;
  }
}

/* ==========================================================
   Якоря (плавная прокрутка) и бутстрап
========================================================== */

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", e => {
    e.preventDefault();
    const t = document.querySelector(a.getAttribute("href"));
    if (t) t.scrollIntoView({ behavior: "smooth" });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  renderGroups();
  loadProfessionPage();
  loadTestPage();
});
