/* E-Kit admin panel — vanilla JS SPA */
(function () {
  const API = ""; // same origin
  const TOKEN_KEY = "vh_admin_token";
  let token = localStorage.getItem(TOKEN_KEY) || null;
  let productCache = []; // products list reused by content/calculator pickers
  let contentCache = {};
  let categoryCache = []; // categories reused by the product form
  let brandCache = [];
  let homeCache = []; // home sections
  let supplierCache = [];
  let crmLeadCache = [];
  let adminEmail = "";

  // ── helpers ────────────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => (n == null ? "—" : "$" + Number(n).toLocaleString("en-US"));
  const dt = (s) => new Date(s).toLocaleString("uk-UA", { dateStyle: "short", timeStyle: "short" });

  const TYPE_LABEL = { order: "Замовлення", consultation: "Консультація", callback: "Дзвінок" };
  const STATUS_LABEL = {
    new: "Необроблені",
    contacted: "Зв’язались",
    proposal: "Пропозиція",
    won: "Успішно",
    lost: "Втрачено",
    in_progress: "Зв’язались",
    done: "Успішно",
  };
  const CRM_STATUSES = ["new", "contacted", "proposal", "won", "lost"];

  async function api(path, opts = {}) {
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch(API + path, { ...opts, headers });
    if (res.status === 401) {
      logout();
      throw new Error("Сесія завершена, увійдіть знову");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ? (typeof data.error === "string" ? data.error : "Помилка") : "Помилка запиту");
    return data;
  }

  // ── auth ────────────────────────────────────────────────────────────────────
  function showApp(email) {
    adminEmail = email;
    $("login").style.display = "none";
    $("app").style.display = "block";
    $("who").textContent = email;
    loadSeoSetting();
    const savedTab = new URL(location.href).searchParams.get("tab") || "crm";
    activateTab(savedTab);
  }
  function logout() {
    token = null;
    localStorage.removeItem(TOKEN_KEY);
    $("app").style.display = "none";
    $("login").style.display = "flex";
    $("noindexWrap").style.display = "none";
  }

  // ── SEO / indexing toggle (checkbox in the topbar) ──────────────────────────
  async function loadSeoSetting() {
    const cb = $("noindexToggle");
    try {
      const seo = await api("/api/settings/seo");
      cb.checked = seo.indexable === false; // checked = closed from indexing
      $("noindexWrap").style.display = "flex";
    } catch {
      $("noindexWrap").style.display = "none";
    }
  }
  $("noindexToggle").addEventListener("change", async () => {
    const cb = $("noindexToggle");
    try {
      await api("/api/settings/seo", { method: "PUT", body: JSON.stringify({ indexable: !cb.checked }) });
    } catch (err) {
      alert(err.message);
      cb.checked = !cb.checked; // revert on failure
    }
  });

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("loginError").textContent = "";
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: $("email").value.trim(), password: $("password").value }),
      });
      token = data.token;
      localStorage.setItem(TOKEN_KEY, token);
      showApp(data.admin.email);
    } catch (err) {
      $("loginError").textContent = err.message;
    }
  });
  $("logout").addEventListener("click", logout);

  // ── tabs ──────────────────────────────────────────────────────────────────
  const ALL_TABS = ["crm", "leads", "suppliers", "pricing", "products", "brands", "categories", "home", "testimonials", "content", "calculator", "security"];

  function activateTab(tab) {
    if (!ALL_TABS.includes(tab)) tab = "crm";
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
    if (btn) btn.classList.add("active");
    ALL_TABS.forEach((t) => { $("tab-" + t).style.display = t === tab ? "block" : "none"; });
    const url = new URL(location.href);
    url.searchParams.set("tab", tab);
    history.replaceState(null, "", url);
    if (tab === "crm") loadCrm();
    if (tab === "leads") loadLeads();
    if (tab === "suppliers") loadSuppliers();
    if (tab === "pricing") loadPricing();
    if (tab === "products") loadProducts();
    if (tab === "brands") loadBrands();
    if (tab === "categories") loadCategories();
    if (tab === "home") loadHomeSections();
    if (tab === "testimonials") loadTestimonials();
    if (tab === "content") loadContent();
    if (tab === "calculator") loadCalculator();
    if (tab === "security") loadSecurity();
  }

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  // ── admin credentials ─────────────────────────────────────────────────────
  function loadSecurity() {
    $("securityEmail").value = adminEmail;
    $("securityCurrentPassword").value = "";
    $("securityNewPassword").value = "";
    $("securityConfirmPassword").value = "";
    $("securityError").textContent = "";
    $("securitySuccess").textContent = "";
  }

  $("securitySave").addEventListener("click", async () => {
    const email = $("securityEmail").value.trim();
    const currentPassword = $("securityCurrentPassword").value;
    const newPassword = $("securityNewPassword").value;
    const confirmPassword = $("securityConfirmPassword").value;
    $("securityError").textContent = "";
    $("securitySuccess").textContent = "";
    if (!currentPassword) return $("securityError").textContent = "Введіть поточний пароль";
    if (newPassword && newPassword.length < 8) return $("securityError").textContent = "Новий пароль має містити щонайменше 8 символів";
    if (newPassword !== confirmPassword) return $("securityError").textContent = "Нові паролі не збігаються";
    try {
      const data = await api("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ email, currentPassword, ...(newPassword ? { newPassword } : {}) }),
      });
      token = data.token;
      localStorage.setItem(TOKEN_KEY, token);
      adminEmail = data.admin.email;
      $("who").textContent = adminEmail;
      $("securityCurrentPassword").value = "";
      $("securityNewPassword").value = "";
      $("securityConfirmPassword").value = "";
      $("securitySuccess").textContent = "Облікові дані оновлено. Новий пароль збережено як bcrypt-хеш.";
    } catch (err) {
      $("securityError").textContent = err.message;
    }
  });

  // ── CRM kanban ────────────────────────────────────────────────────────────
  $("refreshCrm").addEventListener("click", loadCrm);
  $("addCrmClient").addEventListener("click", openNewCrmClient);

  function openNewCrmClient() {
    openModal(`<h3>Новий клієнт</h3>
      <div class="grid2"><div class="field"><label>Ім’я *</label><input id="new_client_name"></div><div class="field"><label>Телефон *</label><input id="new_client_phone"></div></div>
      <div class="grid2"><div class="field"><label>Email</label><input id="new_client_email" type="email"></div><div class="field"><label>Тип звернення</label><select id="new_client_type"><option value="consultation">Консультація</option><option value="order">Замовлення</option><option value="callback">Зворотний дзвінок</option></select></div></div>
      <div class="field"><label>Що цікавить</label><input id="new_client_interest" placeholder="Наприклад: комплект для будинку"></div>
      <div class="field"><label>Етап</label><select id="new_client_status">${CRM_STATUSES.map((s) => `<option value="${s}">${STATUS_LABEL[s]}</option>`).join("")}</select></div>
      <div class="field"><label>Нотатки менеджера</label><textarea id="new_client_notes" rows="4"></textarea></div>
      <div class="error" id="new_client_error"></div><div class="modal-actions"><button class="btn btn-ghost" id="new_client_cancel">Скасувати</button><button class="btn" id="new_client_save">Додати</button></div>`);
    $("new_client_cancel").addEventListener("click", closeModal);
    $("new_client_save").addEventListener("click", async () => {
      const body = { type: $("new_client_type").value, name: $("new_client_name").value.trim(), phone: $("new_client_phone").value.trim(), email: $("new_client_email").value.trim(), interest: $("new_client_interest").value.trim(), status: $("new_client_status").value, notes: $("new_client_notes").value };
      try { await api("/api/leads/admin", { method: "POST", body: JSON.stringify(body) }); closeModal(); loadCrm(); }
      catch (err) { $("new_client_error").textContent = err.message; }
    });
  }

  function normalizeLeadStatus(status) {
    if (status === "in_progress") return "contacted";
    if (status === "done") return "won";
    return CRM_STATUSES.includes(status) ? status : "new";
  }

  async function loadCrm() {
    try {
      const leads = await api("/api/leads?type=all&status=all");
      crmLeadCache = leads;
      const counts = Object.fromEntries(CRM_STATUSES.map((s) => [s, 0]));
      leads.forEach((l) => counts[normalizeLeadStatus(l.status)]++);
      $("crmStats").innerHTML = [
        ["Усього клієнтів", leads.length],
        ["Необроблені", counts.new],
        ["У роботі", counts.contacted + counts.proposal],
        ["Успішні", counts.won],
        ["Втрачено", counts.lost],
      ].map(([label, value]) => `<div class="stat"><div class="n">${value}</div><div class="l">${label}</div></div>`).join("");
      renderKanban(leads);
    } catch (err) {
      $("kanbanBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`;
    }
  }

  function renderKanban(leads) {
    $("kanbanBody").innerHTML = CRM_STATUSES.map((status) => {
      const rows = leads.filter((l) => normalizeLeadStatus(l.status) === status);
      const cards = rows.map((l) => {
        const details = l.interest || (l.items && l.items.length ? `${l.items.length} товар(и)` : TYPE_LABEL[l.type] || l.type);
        return `<article class="lead-card" draggable="true" data-lead-id="${esc(l.id)}">
          <span class="badge b-${esc(l.type)}">${esc(TYPE_LABEL[l.type] || l.type)}</span>
          <h4>${esc(l.name)}</h4>
          <div class="lead-meta"><a href="tel:${esc(l.phone)}">${esc(l.phone)}</a><br>${esc(details || "Без деталей")}<br>${dt(l.createdAt)}</div>
          ${l.total != null ? `<div class="lead-total">${money(l.total)}</div>` : ""}
          ${l.notes ? `<div class="items">${esc(l.notes).slice(0, 90)}</div>` : ""}
          <div class="lead-actions"><button class="btn-sm btn-ghost" data-open-lead="${esc(l.id)}">Відкрити</button></div>
        </article>`;
      }).join("");
      return `<div class="kanban-col" data-drop-status="${status}">
        <div class="kanban-head"><span>${STATUS_LABEL[status]}</span><span class="kanban-count">${rows.length}</span></div>
        <div class="kanban-list">${cards || `<div class="empty" style="padding:30px 5px">Немає клієнтів</div>`}</div>
      </div>`;
    }).join("");

    document.querySelectorAll(".lead-card").forEach((card) => {
      card.addEventListener("dragstart", () => card.classList.add("dragging"));
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
    });
    document.querySelectorAll("[data-drop-status]").forEach((col) => {
      col.addEventListener("dragover", (e) => e.preventDefault());
      col.addEventListener("drop", async (e) => {
        e.preventDefault();
        const card = document.querySelector(".lead-card.dragging");
        if (!card) return;
        try {
          await api("/api/leads/" + card.dataset.leadId, {
            method: "PATCH",
            body: JSON.stringify({ status: col.dataset.dropStatus }),
          });
          loadCrm();
        } catch (err) { alert(err.message); }
      });
    });
    document.querySelectorAll("[data-open-lead]").forEach((button) =>
      button.addEventListener("click", () => openLead(crmLeadCache.find((l) => l.id === button.dataset.openLead)))
    );
  }

  function openLead(lead) {
    if (!lead) return;
    const items = lead.items && lead.items.length
      ? `<div class="items" style="margin-bottom:16px">${lead.items.map((it) => `<div>• ${esc(it.name)} × ${it.quantity} — ${money(it.price * it.quantity)}</div>`).join("")}</div>`
      : "";
    openModal(`<h3>${esc(lead.name)}</h3>
      <div class="field"><label>Контакт</label><div><a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a>${lead.email ? ` · ${esc(lead.email)}` : ""}</div></div>
      ${lead.interest ? `<div class="field"><label>Інтерес</label><div>${esc(lead.interest)}</div></div>` : ""}
      ${lead.message ? `<div class="field"><label>Повідомлення</label><div>${esc(lead.message)}</div></div>` : ""}
      ${items}
      <div class="field"><label>Етап</label><select id="crm_status">${CRM_STATUSES.map((s) => `<option value="${s}" ${s === normalizeLeadStatus(lead.status) ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}</select></div>
      <div class="field"><label>Нотатки менеджера</label><textarea id="crm_notes" rows="5" placeholder="Домовленості, наступний крок, бюджет…">${esc(lead.notes || "")}</textarea></div>
      <div class="error" id="crm_error"></div>
      <div class="modal-actions"><button class="btn btn-ghost" id="crm_cancel">Закрити</button><button class="btn" id="crm_save">Зберегти</button></div>`);
    $("crm_cancel").addEventListener("click", closeModal);
    $("crm_save").addEventListener("click", async () => {
      try {
        await api("/api/leads/" + lead.id, { method: "PATCH", body: JSON.stringify({ status: $("crm_status").value, notes: $("crm_notes").value }) });
        closeModal();
        loadCrm();
      } catch (err) { $("crm_error").textContent = err.message; }
    });
  }

  // ── Suppliers ─────────────────────────────────────────────────────────────
  $("addSupplier").addEventListener("click", () => supplierModal(null));

  async function loadSuppliers() {
    try {
      supplierCache = await api("/api/crm/suppliers");
      $("suppliersBody").innerHTML = supplierCache.length
        ? `<table><thead><tr><th>Назва</th><th>Контакт</th><th>Телефон / Email</th><th>Сайт</th><th>Цін</th><th>Статус</th><th></th></tr></thead><tbody>${
            supplierCache.map((s) => `<tr class="${s.active ? "" : "supplier-inactive"}">
              <td><strong>${esc(s.name)}</strong></td>
              <td class="supplier-meta">${esc(s.contactName || "—")}</td>
              <td class="supplier-meta">${s.phone ? `<a href="tel:${esc(s.phone)}">${esc(s.phone)}</a>` : ""}${s.phone && s.email ? "<br>" : ""}${s.email ? esc(s.email) : ""}${!s.phone && !s.email ? "—" : ""}</td>
              <td class="supplier-meta">${s.website ? `<a href="${esc(s.website)}" target="_blank" rel="noopener">${esc(s.website)}</a>` : "—"}</td>
              <td>${s._count ? s._count.prices : 0}</td>
              <td><span class="badge ${s.active ? "s-done" : "s-new"}">${s.active ? "Активний" : "Вимкнений"}</span></td>
              <td class="nowrap"><div class="row-actions"><button class="btn-sm btn-ghost" data-edit-supplier="${esc(s.id)}">Редагувати</button><button class="btn-sm btn-danger" data-del-supplier="${esc(s.id)}">Видалити</button></div></td>
            </tr>`).join("")
          }</tbody></table>`
        : `<div class="empty">Додайте першого постачальника</div>`;
      document.querySelectorAll("[data-edit-supplier]").forEach((b) => b.addEventListener("click", () => supplierModal(supplierCache.find((s) => s.id === b.dataset.editSupplier))));
      document.querySelectorAll("[data-del-supplier]").forEach((b) => b.addEventListener("click", async () => {
        if (!confirm("Видалити постачальника та всі його ціни?")) return;
        try { await api("/api/crm/suppliers/" + b.dataset.delSupplier, { method: "DELETE" }); loadSuppliers(); }
        catch (err) { alert(err.message); }
      }));
    } catch (err) { $("suppliersBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
  }

  function supplierModal(supplier) {
    const isNew = !supplier;
    const s = supplier || { name: "", contactName: "", phone: "", email: "", website: "", notes: "", active: true };
    openModal(`<h3>${isNew ? "Новий постачальник" : "Редагувати постачальника"}</h3>
      <div class="field"><label>Назва *</label><input id="sup_name" value="${esc(s.name)}"></div>
      <div class="grid2"><div class="field"><label>Контактна особа</label><input id="sup_contact" value="${esc(s.contactName || "")}"></div><div class="field"><label>Телефон</label><input id="sup_phone" value="${esc(s.phone || "")}"></div></div>
      <div class="grid2"><div class="field"><label>Email</label><input id="sup_email" type="email" value="${esc(s.email || "")}"></div><div class="field"><label>Сайт</label><input id="sup_website" value="${esc(s.website || "")}"></div></div>
      <div class="field"><label>Умови та нотатки</label><textarea id="sup_notes" rows="4">${esc(s.notes || "")}</textarea></div>
      <div class="field"><label style="display:flex;gap:8px;align-items:center;text-transform:none"><input id="sup_active" type="checkbox" ${s.active ? "checked" : ""} style="width:auto"> Активний постачальник</label></div>
      <div class="error" id="sup_error"></div><div class="modal-actions"><button class="btn btn-ghost" id="sup_cancel">Скасувати</button><button class="btn" id="sup_save">Зберегти</button></div>`);
    $("sup_cancel").addEventListener("click", closeModal);
    $("sup_save").addEventListener("click", async () => {
      const body = { name: $("sup_name").value.trim(), contactName: $("sup_contact").value.trim(), phone: $("sup_phone").value.trim(), email: $("sup_email").value.trim(), website: $("sup_website").value.trim(), notes: $("sup_notes").value, active: $("sup_active").checked };
      try {
        await api(isNew ? "/api/crm/suppliers" : "/api/crm/suppliers/" + s.id, { method: isNew ? "POST" : "PUT", body: JSON.stringify(body) });
        closeModal(); loadSuppliers();
      } catch (err) { $("sup_error").textContent = err.message; }
    });
  }

  // ── Supplier price matrix ─────────────────────────────────────────────────
  $("refreshPricing").addEventListener("click", loadPricing);

  async function loadPricing() {
    try {
      const data = await api("/api/crm/price-matrix");
      const covered = new Set(data.prices.map((p) => p.productId)).size;
      $("pricingSummary").innerHTML = [["Товарів", data.products.length], ["Постачальників", data.suppliers.length], ["З цінами", covered]].map(([l, n]) => `<div class="stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join("");
      if (!data.suppliers.length) {
        $("pricingBody").innerHTML = `<div class="card empty">Спочатку додайте постачальників</div>`;
        return;
      }
      const priceMap = new Map(data.prices.map((p) => [`${p.productId}:${p.supplierId}`, p]));
      const head = data.suppliers.map((s) => `<th>${esc(s.name)}</th>`).join("");
      const rows = data.products.map((product) => {
        const cells = data.suppliers.map((supplier) => {
          const row = priceMap.get(`${product.id}:${supplier.id}`);
          const isUnavailable = row && (row.availability === "unavailable" || row.price === 0);
          const isBest = row && !isUnavailable && data.bestByProduct[product.id] === row.price;
          const margin = row && !isUnavailable && product.retailPrice > 0 ? Math.round(((product.retailPrice - row.price) / product.retailPrice) * 100) : null;
          return `<td class="price-cell ${isBest ? "best" : ""} ${isUnavailable ? "unavailable" : ""}"><input type="number" min="0" placeholder="—" value="${row ? row.price : ""}" data-price-product="${esc(product.id)}" data-price-supplier="${esc(supplier.id)}">
            ${isUnavailable ? `<span class="unavail-label">Немає в наявності</span>` : ""}${isBest ? `<span class="best-label">✓ Найкраща ціна</span>` : ""}${margin != null ? `<span class="margin-label">Маржа ${margin}%</span>` : ""}</td>`;
        }).join("");
        return `<tr><td><strong>${esc(product.name)}</strong><div class="muted" style="font-size:11px">${esc(product.categoryLabel || "Без категорії")} · ${esc(product.brandLabel || "Без бренду")} · роздріб ${money(product.retailPrice)}</div></td>${cells}</tr>`;
      }).join("");
      $("pricingBody").innerHTML = `<div class="matrix-wrap"><table class="price-matrix"><thead><tr><th>Товар</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
      document.querySelectorAll("[data-price-product]").forEach((input) => input.addEventListener("change", async () => {
        input.disabled = true;
        try {
          if (input.value === "") {
            await api("/api/crm/prices", { method: "DELETE", body: JSON.stringify({ productId: input.dataset.priceProduct, supplierId: input.dataset.priceSupplier }) });
          } else {
            const price = Number(input.value);
            const availability = price === 0 ? "unavailable" : "in_stock";
            await api("/api/crm/prices", { method: "PUT", body: JSON.stringify({ productId: input.dataset.priceProduct, supplierId: input.dataset.priceSupplier, price, currency: "USD", availability, minOrderQty: 1 }) });
          }
          loadPricing();
        } catch (err) { input.disabled = false; alert(err.message); }
      }));
    } catch (err) { $("pricingBody").innerHTML = `<div class="card empty">${esc(err.message)}</div>`; }
  }

  // ── leads ─────────────────────────────────────────────────────────────────
  $("refreshLeads").addEventListener("click", loadLeads);
  $("filterType").addEventListener("change", loadLeads);
  $("filterStatus").addEventListener("change", loadLeads);

  async function loadLeads() {
    try {
      const stats = await api("/api/leads/stats");
      $("stats").innerHTML = [
        ["Усього заявок", stats.total],
        ["Нові", stats.new],
        ["Замовлення", stats.orders],
        ["Консультації", stats.consultations],
        ["Дзвінки", stats.callbacks],
      ]
        .map(([l, n]) => `<div class="stat"><div class="n">${n}</div><div class="l">${l}</div></div>`)
        .join("");

      const type = $("filterType").value;
      const status = $("filterStatus").value;
      const leads = await api(`/api/leads?type=${type}&status=${status}`);
      renderLeads(leads);
    } catch (err) {
      $("leadsBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`;
    }
  }

  function renderLeads(leads) {
    if (!leads.length) {
      $("leadsBody").innerHTML = `<div class="empty">Заявок поки немає</div>`;
      return;
    }
    const rows = leads
      .map((l) => {
        let details = "";
        if (l.interest) details += `<div class="muted">Цікавить: ${esc(l.interest)}</div>`;
        if (l.message) details += `<div class="muted">«${esc(l.message)}»</div>`;
        if (l.items && l.items.length) {
          details +=
            `<div class="items">` +
            l.items.map((it) => `<div>• ${esc(it.name)} × ${it.quantity} — ${money(it.price * it.quantity)}</div>`).join("") +
            `<div><strong>Разом: ${money(l.total)}</strong></div></div>`;
        }
        const normalizedStatus = l.status === "in_progress" ? "contacted" : l.status === "done" ? "won" : l.status;
        const statusOpts = CRM_STATUSES
          .map((s) => `<option value="${s}" ${s === normalizedStatus ? "selected" : ""}>${STATUS_LABEL[s]}</option>`)
          .join("");
        return `<tr>
          <td class="nowrap"><span class="badge b-${l.type}">${TYPE_LABEL[l.type] || l.type}</span></td>
          <td><strong>${esc(l.name)}</strong><br><a href="tel:${esc(l.phone)}">${esc(l.phone)}</a>${
          l.email ? `<br><span class="muted">${esc(l.email)}</span>` : ""
        }${details}</td>
          <td class="nowrap"><span class="badge s-${l.status}">${STATUS_LABEL[l.status]}</span></td>
          <td class="nowrap muted">${dt(l.createdAt)}</td>
          <td class="nowrap"><div class="row-actions">
            <select data-status="${l.id}">${statusOpts}</select>
            <button class="btn-sm btn-danger" data-del-lead="${l.id}">Видалити</button>
          </div></td>
        </tr>`;
      })
      .join("");
    $("leadsBody").innerHTML = `<table>
      <thead><tr><th>Тип</th><th>Клієнт</th><th>Статус</th><th>Дата</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table>`;

    document.querySelectorAll("[data-status]").forEach((sel) =>
      sel.addEventListener("change", async () => {
        try {
          await api("/api/leads/" + sel.dataset.status, { method: "PATCH", body: JSON.stringify({ status: sel.value }) });
          loadLeads();
        } catch (err) {
          alert(err.message);
        }
      })
    );
    document.querySelectorAll("[data-del-lead]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Видалити заявку?")) return;
        try {
          await api("/api/leads/" + b.dataset.delLead, { method: "DELETE" });
          loadLeads();
        } catch (err) {
          alert(err.message);
        }
      })
    );
  }

  // ── products ────────────────────────────────────────────────────────────────
  async function loadBrands() {
    try {
      brandCache = await api("/api/brands?all=1");
      $("brandsBody").innerHTML = brandCache.length ? `<table><thead><tr><th>Бренд</th><th>Країна</th><th>Товарів</th><th>Статус</th><th></th></tr></thead><tbody>${brandCache.map((b) => `<tr>
        <td><strong>${esc(b.name)}</strong><div class="muted">${esc(b.slug)}${b.description ? ` · ${esc(b.description).slice(0, 100)}` : ""}</div></td>
        <td>${esc(b.country || "—")}</td><td>${b._count?.products || 0}</td><td>${b.enabled ? "Активний" : "Прихований"}</td>
        <td><div class="row-actions"><button class="btn-sm btn-ghost" data-edit-brand="${esc(b.slug)}">Редагувати</button><button class="btn-sm btn-danger" data-del-brand="${esc(b.slug)}">Видалити</button></div></td></tr>`).join("")}</tbody></table>` : `<div class="empty">Брендів ще немає</div>`;
      document.querySelectorAll("[data-edit-brand]").forEach((el) => el.addEventListener("click", () => brandModal(brandCache.find((b) => b.slug === el.dataset.editBrand))));
      document.querySelectorAll("[data-del-brand]").forEach((el) => el.addEventListener("click", async () => {
        if (!confirm("Видалити бренд? У товарах поле бренду стане порожнім.")) return;
        try { await api("/api/brands/" + el.dataset.delBrand, { method: "DELETE" }); loadBrands(); } catch (err) { alert(err.message); }
      }));
    } catch (err) { $("brandsBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
  }

  function brandModal(brand) {
    const isNew = !brand; const b = brand || { slug: "", name: "", country: "", logo: "", description: "", enabled: true };
    openModal(`<h3>${isNew ? "Новий бренд" : "Редагувати бренд"}</h3>
      <div class="grid2"><div class="field"><label>Slug *</label><input id="brand_slug" value="${esc(b.slug)}" ${isNew ? "" : "readonly"}></div><div class="field"><label>Назва *</label><input id="brand_name" value="${esc(b.name)}"></div></div>
      <div class="grid2"><div class="field"><label>Країна</label><input id="brand_country" value="${esc(b.country)}"></div><div class="field"><label>Логотип (URL)</label><input id="brand_logo" value="${esc(b.logo)}"></div></div>
      <div class="field"><label>Опис</label><textarea id="brand_description" rows="4">${esc(b.description)}</textarea></div>
      <div class="field"><label style="display:flex;gap:8px;align-items:center;text-transform:none"><input id="brand_enabled" type="checkbox" ${b.enabled ? "checked" : ""} style="width:auto"> Показувати на сайті</label></div>
      <div class="error" id="brand_error"></div><div class="modal-actions"><button class="btn btn-ghost" id="brand_cancel">Скасувати</button><button class="btn" id="brand_save">Зберегти</button></div>`);
    $("brand_cancel").addEventListener("click", closeModal);
    $("brand_save").addEventListener("click", async () => {
      const body = { slug: $("brand_slug").value.trim(), name: $("brand_name").value.trim(), country: $("brand_country").value.trim(), logo: $("brand_logo").value.trim(), description: $("brand_description").value.trim(), enabled: $("brand_enabled").checked };
      try { await api(isNew ? "/api/brands" : "/api/brands/" + b.slug, { method: isNew ? "POST" : "PUT", body: JSON.stringify(body) }); closeModal(); loadBrands(); } catch (err) { $("brand_error").textContent = err.message; }
    });
  }
  $("addBrand").addEventListener("click", () => brandModal(null));

  async function loadProducts() {
    try {
      const [products, cats, brands] = await Promise.all([api("/api/products"), api("/api/categories?all=1"), api("/api/brands?all=1")]);
      productCache = products;
      categoryCache = cats;
      brandCache = brands;
      $("productCategoryFilter").innerHTML = `<option value="all">Усі категорії</option>${cats.map((c) => `<option value="${esc(c.key)}">${c.parentKey ? "↳ " : ""}${esc(c.label)}</option>`).join("")}`;
      $("productBrandFilter").innerHTML = `<option value="all">Усі бренди</option>${brands.map((b) => `<option value="${esc(b.slug)}">${esc(b.name)}</option>`).join("")}`;
      renderProducts();
    } catch (err) {
      $("productsBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`;
    }
  }

  function renderProducts() {
    const query = $("productSearch").value.trim().toLowerCase();
    const category = $("productCategoryFilter").value;
    const brand = $("productBrandFilter").value;
    const rows = productCache.filter((p) => {
      const matchesText = !query || p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query);
      const matchesCategory = category === "all" || (p.categoryKeys || [p.category]).includes(category);
      const matchesBrand = brand === "all" || p.brandSlug === brand;
      return matchesText && matchesCategory && matchesBrand;
    });
    $("productFilterCount").textContent = `Показано ${rows.length} із ${productCache.length}`;
    $("productsBody").innerHTML = rows.length ? `<table><thead><tr><th>Товар</th><th>Бренд</th><th>Категорії</th><th>Ціна</th><th>Параметри</th><th></th></tr></thead><tbody>${rows.map((p) => {
      const labels = (p.categoryKeys || [p.category]).map((key) => categoryCache.find((c) => c.key === key)?.label || key);
      return `<tr><td><strong>${esc(p.name)}</strong><div class="muted" style="font-size:11px">${esc(p.id)}</div></td>
        <td>${esc(p.brand?.name || "—")}</td><td>${labels.map((label) => `<span class="badge" style="margin:2px">${esc(label)}</span>`).join("")}</td>
        <td class="nowrap"><strong>${money(p.price)}</strong></td><td class="muted" style="font-size:12px">${[p.power, p.capacity, p.efficiency, p.warranty].filter(Boolean).map(esc).join(" · ") || "—"}</td>
        <td class="nowrap"><div class="row-actions"><button class="btn-sm btn-ghost" data-edit-product="${esc(p.id)}">Редагувати</button><button class="btn-sm btn-danger" data-del-product="${esc(p.id)}">Видалити</button></div></td></tr>`;
    }).join("")}</tbody></table>` : `<div class="empty">За цими фільтрами товарів немає</div>`;
    document.querySelectorAll("[data-edit-product]").forEach((b) => b.addEventListener("click", () => productModal(productCache.find((p) => p.id === b.dataset.editProduct))));
    document.querySelectorAll("[data-del-product]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Видалити товар?")) return;
      try { await api("/api/products/" + b.dataset.delProduct, { method: "DELETE" }); loadProducts(); } catch (err) { alert(err.message); }
    }));
  }

  $("productSearch").addEventListener("input", renderProducts);
  $("productCategoryFilter").addEventListener("change", renderProducts);
  $("productBrandFilter").addEventListener("change", renderProducts);

  $("addProduct").addEventListener("click", () => productModal(null));

  async function apiUpload(path, formData) {
    const headers = {};
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch(path, { method: "POST", headers, body: formData });
    if (res.status === 401) {
      logout();
      throw new Error("Сесія завершена, увійдіть знову");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error && typeof data.error === "string" ? data.error : "Помилка завантаження");
    return data;
  }

  function renderProductImages(p) {
    const box = $("m_images");
    if (!box) return;
    const imgs = p.images || [];
    box.innerHTML = imgs.length
      ? `<div style="display:flex;gap:8px;flex-wrap:wrap">` +
        imgs
          .map(
            (u) => `<div style="position:relative;width:64px;height:64px;border:1px solid var(--slate-200);border-radius:8px;overflow:hidden">
        <img src="${esc(u)}" style="width:100%;height:100%;object-fit:cover" alt="" />
        <button type="button" data-delimg="${esc(u)}" title="Видалити" style="position:absolute;top:2px;right:2px;background:rgba(15,23,42,.7);color:#fff;border:none;border-radius:4px;width:18px;height:18px;line-height:1;cursor:pointer;font-size:12px">×</button>
      </div>`
          )
          .join("") +
        `</div>`
      : `<div class="muted" style="font-size:12px">Фото ще немає</div>`;
    box.querySelectorAll("[data-delimg]").forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          const updated = await api("/api/products/" + encodeURIComponent(p.id) + "/images", {
            method: "DELETE",
            body: JSON.stringify({ url: b.dataset.delimg }),
          });
          p.images = updated.images;
          renderProductImages(p);
          loadProducts();
        } catch (err) {
          alert(err.message);
        }
      })
    );
  }

  function productModal(p) {
    const isNew = !p;
    p = p || { id: "", name: "", category: "inverter", categoryKeys: ["inverter"], price: 0, warranty: "", features: [], image: "", images: [] };
    const selectedCategoryKeys = new Set(p.categoryKeys || [p.category]);
    openModal(`
      <h3>${isNew ? "Новий товар" : "Редагувати товар"}</h3>
      <div class="field"><label>ID (латиницею, напр. inv-5kw)</label><input id="m_id" value="${esc(p.id)}" ${
      isNew ? "" : "readonly"
    } /></div>
      <div class="field"><label>Назва</label><input id="m_name" value="${esc(p.name)}" /></div>
      <div class="grid2">
        <div class="field"><label>Основна категорія</label><select id="m_category">
          ${(() => {
            const keys = categoryCache.length ? categoryCache.map((c) => c.key) : ["inverter", "battery", "solar", "station"];
            if (p.category && !keys.includes(p.category)) keys.unshift(p.category);
            return keys
              .map((k) => {
                const c = categoryCache.find((x) => x.key === k);
                return `<option value="${esc(k)}" ${k === p.category ? "selected" : ""}>${c && c.parentKey ? "↳ " : ""}${esc(c ? c.label : k)}</option>`;
              })
              .join("");
          })()}
        </select></div>
        <div class="field"><label>Бренд</label><select id="m_brand"><option value="">Без бренду</option>${brandCache.map((b) => `<option value="${esc(b.slug)}" ${b.slug === p.brandSlug ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select></div>
      </div>
      <div class="field">
        <label>Додаткові категорії та підкатегорії</label>
        <div class="muted" style="font-size:12px;margin-bottom:8px">Товар буде показаний у кожному вибраному розділі. Основна категорія використовується в картці товару та для SEO.</div>
        <div class="category-chips">
          ${categoryCache.map((c) => `<label class="category-check">
            <input type="checkbox" data-product-category value="${esc(c.key)}" ${selectedCategoryKeys.has(c.key) ? "checked" : ""}>
            <span>${c.parentKey ? "↳ " : ""}${esc(c.label)}</span>
          </label>`).join("")}
        </div>
      </div>
      <div class="field"><label>Гарантія</label><input id="m_warranty" value="${esc(p.warranty)}" /></div>
      <div class="grid2">
        <div class="field"><label>Ціна ($)</label><input id="m_price" type="number" value="${esc(p.price)}" /></div>
        <div class="field"><label>Стара ціна ($)</label><input id="m_originalPrice" type="number" value="${esc(p.originalPrice ?? "")}" /></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Потужність</label><input id="m_power" value="${esc(p.power ?? "")}" /></div>
        <div class="field"><label>Ємність</label><input id="m_capacity" value="${esc(p.capacity ?? "")}" /></div>
      </div>
      <div class="grid2">
        <div class="field"><label>ККД</label><input id="m_efficiency" value="${esc(p.efficiency ?? "")}" /></div>
        <div class="field"><label>Бейдж</label><input id="m_badge" value="${esc(p.badge ?? "")}" /></div>
      </div>
      <div class="field"><label>Зображення (шлях)</label><input id="m_image" value="${esc(p.image ?? "")}" /></div>
      <div class="field"><label>Характеристики (по одній на рядок)</label><textarea id="m_features" rows="4">${esc(
        (p.features || []).join("\n")
      )}</textarea></div>
      ${
        isNew
          ? `<div class="field"><label>Фото товару</label><div class="muted" style="font-size:12px">Спочатку збережіть товар, потім відкрийте його знову, щоб завантажити фото.</div></div>`
          : `<div class="field"><label>Фото товару</label>
              <div id="m_images"></div>
              <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
                <input type="file" id="m_imgfile" accept="image/*" multiple />
                <button type="button" class="btn-sm btn-ghost" id="m_imgupload">Завантажити фото</button>
              </div>
              <div class="muted" style="font-size:11px;margin-top:6px">Можна кілька. Якщо фото немає — на сайті показується стандартна іконка категорії.</div>
            </div>`
      }
      <div class="error" id="m_error"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="m_cancel">Скасувати</button>
        <button class="btn" id="m_save">Зберегти</button>
      </div>
    `);
    const syncPrimaryCategory = () => {
      document.querySelectorAll("[data-product-category]").forEach((checkbox) => {
        const isPrimary = checkbox.value === $("m_category").value;
        if (isPrimary) checkbox.checked = true;
        checkbox.disabled = isPrimary;
        checkbox.closest(".category-check")?.classList.toggle("is-primary", isPrimary);
      });
    };
    $("m_category").addEventListener("change", syncPrimaryCategory);
    syncPrimaryCategory();
    if (!isNew) {
      renderProductImages(p);
      $("m_imgupload").addEventListener("click", async () => {
        const files = $("m_imgfile").files;
        if (!files || !files.length) return alert("Оберіть файл(и)");
        const fd = new FormData();
        for (const f of files) fd.append("images", f);
        try {
          const updated = await apiUpload("/api/products/" + encodeURIComponent(p.id) + "/images", fd);
          p.images = updated.images;
          $("m_imgfile").value = "";
          renderProductImages(p);
          loadProducts();
        } catch (err) {
          $("m_error").textContent = err.message;
        }
      });
    }
    $("m_cancel").addEventListener("click", closeModal);
    $("m_save").addEventListener("click", async () => {
      const num = (v) => (v === "" || v == null ? null : Number(v));
      const body = {
        id: $("m_id").value.trim(),
        name: $("m_name").value.trim(),
        category: $("m_category").value,
        categoryKeys: Array.from(new Set([
          $("m_category").value,
          ...Array.from(document.querySelectorAll("[data-product-category]:checked")).map((checkbox) => checkbox.value),
        ])),
        brandSlug: $("m_brand").value || null,
        price: num($("m_price").value) || 0,
        originalPrice: num($("m_originalPrice").value),
        power: $("m_power").value.trim() || null,
        capacity: $("m_capacity").value.trim() || null,
        efficiency: $("m_efficiency").value.trim() || null,
        badge: $("m_badge").value.trim() || null,
        warranty: $("m_warranty").value.trim(),
        image: $("m_image").value.trim(),
        features: $("m_features").value.split("\n").map((s) => s.trim()).filter(Boolean),
      };
      try {
        // POST upserts by id (works for both create and edit)
        await api("/api/products", { method: "POST", body: JSON.stringify(body) });
        closeModal();
        loadProducts();
      } catch (err) {
        $("m_error").textContent = err.message;
      }
    });
  }

  // ── testimonials ────────────────────────────────────────────────────────────
  async function loadTestimonials() {
    try {
      const items = await api("/api/testimonials");
      $("testimonialsBody").innerHTML = items.length
        ? items
            .map(
              (t) => `<div class="pcard">
        <div class="cat">${"★".repeat(t.rating)} · ${esc(t.location)}</div>
        <h4>${esc(t.name)}</h4>
        <div class="muted" style="font-size:13px;margin-top:6px">«${esc(t.text)}»</div>
        <div class="muted" style="font-size:12px;margin-top:6px">${esc(t.product)}</div>
        <div class="acts"><button class="btn-sm btn-danger" data-del-t="${esc(t.id)}">Видалити</button></div>
      </div>`
            )
            .join("")
        : `<div class="empty">Відгуків немає</div>`;
      document.querySelectorAll("[data-del-t]").forEach((b) =>
        b.addEventListener("click", async () => {
          if (!confirm("Видалити відгук?")) return;
          try {
            await api("/api/testimonials/" + b.dataset.delT, { method: "DELETE" });
            loadTestimonials();
          } catch (err) {
            alert(err.message);
          }
        })
      );
    } catch (err) {
      $("testimonialsBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`;
    }
  }

  $("addTestimonial").addEventListener("click", () => {
    openModal(`
      <h3>Новий відгук</h3>
      <div class="field"><label>ID</label><input id="t_id" placeholder="t5" /></div>
      <div class="grid2">
        <div class="field"><label>Ім'я</label><input id="t_name" /></div>
        <div class="field"><label>Місто</label><input id="t_location" /></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Рейтинг (1-5)</label><input id="t_rating" type="number" min="1" max="5" value="5" /></div>
        <div class="field"><label>Ініціали</label><input id="t_avatar" placeholder="МК" /></div>
      </div>
      <div class="field"><label>Товар</label><input id="t_product" /></div>
      <div class="field"><label>Текст</label><textarea id="t_text" rows="4"></textarea></div>
      <div class="error" id="t_error"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="t_cancel">Скасувати</button>
        <button class="btn" id="t_save">Зберегти</button>
      </div>
    `);
    $("t_cancel").addEventListener("click", closeModal);
    $("t_save").addEventListener("click", async () => {
      const body = {
        id: $("t_id").value.trim(),
        name: $("t_name").value.trim(),
        location: $("t_location").value.trim(),
        rating: Number($("t_rating").value) || 5,
        avatar: $("t_avatar").value.trim(),
        product: $("t_product").value.trim(),
        text: $("t_text").value.trim(),
      };
      try {
        await api("/api/testimonials", { method: "POST", body: JSON.stringify(body) });
        closeModal();
        loadTestimonials();
      } catch (err) {
        $("t_error").textContent = err.message;
      }
    });
  });

  // ── categories ──────────────────────────────────────────────────────────────
  async function loadCategories() {
    try {
      const cats = await api("/api/categories?all=1");
      categoryCache = cats;
      $("categoriesBody").innerHTML = cats.length
        ? cats
            .map(
              (c) => `<div class="pcard">
        <div class="cat">${c.parentKey ? "Підкатегорія" : "Категорія"} · ${esc(c.key)}${c.enabled ? "" : " · прихована"}</div>
        <h4>${c.parentKey ? "↳ " : ""}${esc(c.icon)} ${esc(c.label)}</h4>
        ${c.parentKey ? `<div class="muted" style="font-size:11px">Батьківська: ${esc((cats.find((x) => x.key === c.parentKey) || {}).label || c.parentKey)}</div>` : ""}
        <div class="muted" style="font-size:12px;margin-top:4px">${esc(c.description || "")}</div>
        <div class="muted" style="font-size:12px;margin-top:6px">Товарів: <b>${
          productCache.filter((p) => (p.categoryKeys || [p.category]).includes(c.key)).length
        }</b> · порядок: ${c.sortOrder}</div>
        <div class="acts">
          <button class="btn-sm btn-ghost" data-edit-cat='${esc(JSON.stringify(c))}'>Редагувати</button>
          <button class="btn-sm btn-danger" data-del-cat="${esc(c.key)}">Видалити</button>
        </div></div>`
            )
            .join("")
        : `<div class="empty">Категорій немає</div>`;
      // make sure productCache is populated for the "Товарів" count
      if (!productCache.length) {
        productCache = await api("/api/products");
        loadCategories();
        return;
      }
      document.querySelectorAll("[data-edit-cat]").forEach((b) =>
        b.addEventListener("click", () => categoryModal(JSON.parse(b.dataset.editCat)))
      );
      document.querySelectorAll("[data-del-cat]").forEach((b) =>
        b.addEventListener("click", async () => {
          if (!confirm("Видалити категорію? Товари цієї категорії залишаться, але зникнуть з фільтра.")) return;
          try {
            await api("/api/categories/" + encodeURIComponent(b.dataset.delCat), { method: "DELETE" });
            loadCategories();
          } catch (err) {
            alert(err.message);
          }
        })
      );
    } catch (err) {
      $("categoriesBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`;
    }
  }

  function categoryModal(c) {
    const isNew = !c;
    c = c || { key: "", label: "", labelSingular: "", description: "", icon: "📦", sortOrder: 0, enabled: true, parentKey: null };
    openModal(`
      <h3>${isNew ? "Нова категорія" : "Редагувати категорію"}</h3>
      <div class="grid2">
        <div class="field"><label>Ключ (латиниця)</label><input id="cat_key" value="${esc(c.key)}" ${
      isNew ? "" : "readonly"
    } placeholder="generator" /></div>
        <div class="field"><label>Іконка (емодзі)</label><input id="cat_icon" value="${esc(c.icon)}" /></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Назва (множина)</label><input id="cat_label" value="${esc(c.label)}" placeholder="Генератори" /></div>
        <div class="field"><label>Назва (однина)</label><input id="cat_labelSingular" value="${esc(c.labelSingular || "")}" placeholder="Генератор" /></div>
      </div>
      <div class="field"><label>Опис</label><input id="cat_description" value="${esc(c.description || "")}" /></div>
      <div class="field"><label>Батьківська категорія</label><select id="cat_parentKey">
        <option value="">— Основна категорія —</option>
        ${categoryCache.filter((x) => !x.parentKey && x.key !== c.key).map((x) => `<option value="${esc(x.key)}" ${x.key === c.parentKey ? "selected" : ""}>${esc(x.label)}</option>`).join("")}
      </select></div>
      <div class="grid2">
        <div class="field"><label>Порядок</label><input id="cat_sortOrder" type="number" value="${esc(c.sortOrder)}" /></div>
        <div class="field"><label>Показувати на сайті</label><select id="cat_enabled">
          <option value="true" ${c.enabled ? "selected" : ""}>Так</option>
          <option value="false" ${c.enabled ? "" : "selected"}>Ні</option>
        </select></div>
      </div>
      <div class="error" id="cat_error"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cat_cancel">Скасувати</button>
        <button class="btn" id="cat_save">Зберегти</button>
      </div>
    `);
    $("cat_cancel").addEventListener("click", closeModal);
    $("cat_save").addEventListener("click", async () => {
      const body = {
        key: $("cat_key").value.trim(),
        label: $("cat_label").value.trim(),
        labelSingular: $("cat_labelSingular").value.trim(),
        description: $("cat_description").value.trim(),
        icon: $("cat_icon").value.trim() || "📦",
        sortOrder: Number($("cat_sortOrder").value) || 0,
        enabled: $("cat_enabled").value === "true",
        parentKey: $("cat_parentKey").value || null,
      };
      try {
        await api("/api/categories", { method: "POST", body: JSON.stringify(body) });
        closeModal();
        loadCategories();
      } catch (err) {
        $("cat_error").textContent = typeof err.message === "string" ? err.message : "Помилка";
      }
    });
  }

  $("addCategory").addEventListener("click", () => categoryModal(null));

  // ── home sections ─────────────────────────────────────────────────────────
  async function loadHomeSections() {
    try {
      const [sections, products, cats] = await Promise.all([
        api("/api/home-sections?all=1"),
        api("/api/products"),
        api("/api/categories?all=1"),
      ]);
      homeCache = sections;
      productCache = products;
      categoryCache = cats;
      renderHomeSections();
    } catch (err) {
      $("homeBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`;
    }
  }

  function renderHomeSections() {
    const MODE = { products: "Обрані товари", category: "Категорія", cta: "Заклик до дії" };
    $("homeBody").innerHTML = homeCache.length
      ? `<div class="card"><table>
          <thead><tr><th></th><th>Блок</th><th>Тип</th><th>Вміст</th><th>Кнопка</th><th></th></tr></thead><tbody>` +
        homeCache
          .map((s, i) => {
            let content = "—";
            if (s.mode === "category") content = esc(s.category || "—");
            else if (s.mode === "products") content = s.productIds.length + " товар(ів)";
            return `<tr>
            <td class="nowrap">
              <button class="btn-sm btn-ghost" data-up="${s.id}" ${i === 0 ? "disabled" : ""}>↑</button>
              <button class="btn-sm btn-ghost" data-down="${s.id}" ${i === homeCache.length - 1 ? "disabled" : ""}>↓</button>
            </td>
            <td><strong>${esc(s.title || "(без назви)")}</strong>${
              s.enabled ? "" : ' <span class="badge s-new">прихований</span>'
            }${s.subtitle ? `<br><span class="muted" style="font-size:12px">${esc(s.subtitle)}</span>` : ""}</td>
            <td class="nowrap">${MODE[s.mode] || s.mode}</td>
            <td class="nowrap muted">${content}</td>
            <td class="nowrap muted">${esc(s.ctaLabel || "—")}</td>
            <td class="nowrap"><div class="row-actions">
              <button class="btn-sm btn-ghost" data-edit-home='${esc(JSON.stringify(s))}'>Редагувати</button>
              <button class="btn-sm btn-danger" data-del-home="${s.id}">Видалити</button>
            </div></td>
          </tr>`;
          })
          .join("") +
        `</tbody></table></div>`
      : `<div class="empty">Блоків немає</div>`;

    document.querySelectorAll("[data-edit-home]").forEach((b) =>
      b.addEventListener("click", () => homeSectionModal(JSON.parse(b.dataset.editHome)))
    );
    document.querySelectorAll("[data-del-home]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Видалити блок?")) return;
        try {
          await api("/api/home-sections/" + b.dataset.delHome, { method: "DELETE" });
          loadHomeSections();
        } catch (err) {
          alert(err.message);
        }
      })
    );
    document.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", () => moveSection(b.dataset.up, -1)));
    document.querySelectorAll("[data-down]").forEach((b) => b.addEventListener("click", () => moveSection(b.dataset.down, 1)));
  }

  async function moveSection(id, dir) {
    const idx = homeCache.findIndex((s) => s.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= homeCache.length) return;
    const a = homeCache[idx];
    const b = homeCache[j];
    try {
      await api("/api/home-sections/" + a.id, { method: "PUT", body: JSON.stringify({ sortOrder: b.sortOrder }) });
      await api("/api/home-sections/" + b.id, { method: "PUT", body: JSON.stringify({ sortOrder: a.sortOrder }) });
      loadHomeSections();
    } catch (err) {
      alert(err.message);
    }
  }

  function homeSectionModal(s) {
    const isNew = !s;
    s = s || { id: "", title: "", subtitle: "", mode: "products", category: "", productIds: [], ctaLabel: "", ctaHref: "", enabled: true };
    const catOptions = categoryCache
      .map((c) => `<option value="${esc(c.key)}" ${c.key === s.category ? "selected" : ""}>${esc(c.label)} (${esc(c.key)})</option>`)
      .join("");
    const prodOptions = productCache
      .map((p) => `<option value="${esc(p.id)}" ${s.productIds.includes(p.id) ? "selected" : ""}>${esc(p.name)} (${esc((categoryCache.find((c) => c.key === p.category) || {}).label || "Без категорії")})</option>`)
      .join("");
    openModal(`
      <h3>${isNew ? "Новий блок" : "Редагувати блок"}</h3>
      <div class="field"><label>Заголовок</label><input id="h_title" value="${esc(s.title)}" /></div>
      <div class="field"><label>Підзаголовок</label><input id="h_subtitle" value="${esc(s.subtitle)}" /></div>
      <div class="field"><label>Тип блоку</label><select id="h_mode">
        <option value="products" ${s.mode === "products" ? "selected" : ""}>Обрані товари</option>
        <option value="category" ${s.mode === "category" ? "selected" : ""}>Ціла категорія</option>
        <option value="cta" ${s.mode === "cta" ? "selected" : ""}>Заклик до дії (кнопки заявки)</option>
      </select></div>
      <div class="field" id="h_catwrap"><label>Категорія</label><select id="h_category" style="width:100%;padding:8px;border:1px solid var(--slate-200);border-radius:8px"><option value="">—</option>${catOptions}</select></div>
      <div class="field" id="h_prodwrap"><label>Товари у блоці (Ctrl/Cmd — кілька)</label><select id="h_products" multiple size="7" style="width:100%;padding:8px;border:1px solid var(--slate-200);border-radius:8px">${prodOptions}</select></div>
      <div class="grid2">
        <div class="field"><label>Текст кнопки (порожньо — без кнопки)</label><input id="h_ctaLabel" value="${esc(s.ctaLabel)}" placeholder="Переглянути каталог" /></div>
        <div class="field"><label>Посилання кнопки</label><input id="h_ctaHref" value="${esc(s.ctaHref)}" placeholder="напр. /products?category=solar" /></div>
      </div>
      <div class="field"><label>Показувати на сайті</label><select id="h_enabled"><option value="true" ${s.enabled ? "selected" : ""}>Так</option><option value="false" ${s.enabled ? "" : "selected"}>Ні</option></select></div>
      <div class="error" id="h_error"></div>
      <div class="modal-actions"><button class="btn btn-ghost" id="h_cancel">Скасувати</button><button class="btn" id="h_save">Зберегти</button></div>
    `);
    const syncMode = () => {
      const m = $("h_mode").value;
      $("h_catwrap").style.display = m === "category" ? "block" : "none";
      $("h_prodwrap").style.display = m === "products" ? "block" : "none";
    };
    $("h_mode").addEventListener("change", syncMode);
    syncMode();
    $("h_cancel").addEventListener("click", closeModal);
    $("h_save").addEventListener("click", async () => {
      const body = {
        title: $("h_title").value,
        subtitle: $("h_subtitle").value,
        mode: $("h_mode").value,
        category: $("h_category").value,
        productIds: Array.from($("h_products").selectedOptions).map((o) => o.value),
        ctaLabel: $("h_ctaLabel").value,
        ctaHref: $("h_ctaHref").value,
        enabled: $("h_enabled").value === "true",
      };
      try {
        if (isNew) await api("/api/home-sections", { method: "POST", body: JSON.stringify(body) });
        else await api("/api/home-sections/" + s.id, { method: "PUT", body: JSON.stringify(body) });
        closeModal();
        loadHomeSections();
      } catch (err) {
        $("h_error").textContent = typeof err.message === "string" ? err.message : "Помилка";
      }
    });
  }

  $("addHomeSection").addEventListener("click", () => homeSectionModal(null));

  // ── content blocks ────────────────────────────────────────────────────────
  async function loadContent() {
    try {
      const [blocks, products] = await Promise.all([api("/api/content"), api("/api/products")]);
      productCache = products;
      contentCache = blocks;
      const keys = Object.keys(blocks);
      $("contentBody").innerHTML = keys.length
        ? keys
            .map((k) => {
              const b = blocks[k];
              return `<div class="pcard">
          <div class="cat">${esc(k)}</div>
          <h4>${esc(b.heading || "—")}</h4>
          <div class="muted" style="font-size:13px;margin-top:4px">${esc(b.subheading || "")}</div>
          ${b.body ? `<div class="muted" style="font-size:12px;margin-top:6px">${esc(b.body)}</div>` : ""}
          <div class="muted" style="font-size:12px;margin-top:6px">Товарів у блоці: <b>${b.productIds.length}</b></div>
          <div class="acts"><button class="btn-sm btn-ghost" data-edit-content="${esc(k)}">Редагувати</button></div>
        </div>`;
            })
            .join("")
        : `<div class="empty">Блоків немає</div>`;
      document.querySelectorAll("[data-edit-content]").forEach((btn) =>
        btn.addEventListener("click", () => contentModal(btn.dataset.editContent))
      );
    } catch (err) {
      $("contentBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`;
    }
  }

  function contentModal(key) {
    const b = contentCache[key];
    const options = productCache
      .map(
        (p) =>
          `<option value="${esc(p.id)}" ${b.productIds.includes(p.id) ? "selected" : ""}>${esc(p.name)} (${esc(
            (categoryCache.find((c) => c.key === p.category) || {}).label || "Без категорії"
          )})</option>`
      )
      .join("");
    openModal(`
      <h3>Блок: ${esc(key)}</h3>
      <div class="field"><label>Заголовок</label><input id="c_heading" value="${esc(b.heading || "")}" /></div>
      <div class="field"><label>Підзаголовок</label><input id="c_subheading" value="${esc(b.subheading || "")}" /></div>
      <div class="field"><label>Текст</label><textarea id="c_body" rows="3">${esc(b.body || "")}</textarea></div>
      <div class="field"><label>Товари у блоці (Ctrl/Cmd — кілька)</label>
        <select id="c_products" multiple size="7" style="width:100%;padding:8px;border:1px solid var(--slate-200);border-radius:8px">${options}</select>
      </div>
      <div class="error" id="c_error"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="c_cancel">Скасувати</button>
        <button class="btn" id="c_save">Зберегти</button>
      </div>
    `);
    $("c_cancel").addEventListener("click", closeModal);
    $("c_save").addEventListener("click", async () => {
      const productIds = Array.from($("c_products").selectedOptions).map((o) => o.value);
      try {
        await api("/api/content/" + encodeURIComponent(key), {
          method: "PUT",
          body: JSON.stringify({
            heading: $("c_heading").value,
            subheading: $("c_subheading").value,
            body: $("c_body").value,
            productIds,
          }),
        });
        closeModal();
        loadContent();
      } catch (err) {
        $("c_error").textContent = err.message;
      }
    });
  }

  // ── power calculator ────────────────────────────────────────────────────────
  async function loadCalculator() {
    try {
      const [data, products, cats] = await Promise.all([
        api("/api/calculator"),
        api("/api/products"),
        api("/api/categories?all=1"),
      ]);
      productCache = products;
      categoryCache = cats;
      renderRules(data.recommendation);
      renderAppliances(data.appliances);
    } catch (err) {
      $("rulesBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`;
    }
  }

  function catSelect(idAttr, selected, allowEmpty) {
    const empty = allowEmpty ? `<option value="" ${!selected ? "selected" : ""}>— вимкнено —</option>` : "";
    return (
      `<select id="${idAttr}" style="width:100%;padding:8px;border:1px solid var(--slate-200);border-radius:8px">` +
      empty +
      categoryCache
        .map((c) => `<option value="${esc(c.key)}" ${c.key === selected ? "selected" : ""}>${esc(c.label)} (${esc(c.key)})</option>`)
        .join("") +
      `</select>`
    );
  }

  function renderRules(r) {
    $("rulesBody").innerHTML = `
      <p class="muted" style="margin-bottom:14px;font-size:13px">Калькулятор <b>автоматично</b> підбирає найдешевший відповідний товар з усього каталогу — читає потужність (Вт) та ємність (кВт·год) кожного товару в обраних категоріях. Тут задаються лише загальні правила.</p>
      <div class="grid2">
        <div class="field"><label>Автономність, годин (запас енергії)</label><input id="r_autonomyHours" type="number" value="${r.autonomyHours}" /></div>
        <div class="field"><label>Запас потужності інвертора, %</label><input id="r_powerReservePct" type="number" value="${r.powerReservePct}" /></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Категорія інверторів (джерело потужності)</label>${catSelect("r_inverterCategory", r.inverterCategory, false)}</div>
        <div class="field"><label>Категорія акумуляторів (сховище)</label>${catSelect("r_batteryCategory", r.batteryCategory, false)}</div>
      </div>
      <div class="field"><label>Категорія «все-в-одному» (портативні станції; необовʼязково)</label>${catSelect("r_stationCategory", r.stationCategory, true)}</div>
      <div class="error" id="r_error"></div>
      <button class="btn btn-sm" id="r_save" style="margin-top:6px">Зберегти правила</button>
    `;
    $("r_save").addEventListener("click", async () => {
      const body = {
        autonomyHours: Number($("r_autonomyHours").value),
        powerReservePct: Number($("r_powerReservePct").value),
        inverterCategory: $("r_inverterCategory").value,
        batteryCategory: $("r_batteryCategory").value,
        stationCategory: $("r_stationCategory").value,
      };
      const err = $("r_error");
      try {
        await api("/api/calculator", { method: "PUT", body: JSON.stringify(body) });
        err.style.color = "var(--green)";
        err.textContent = "✓ Збережено";
      } catch (e) {
        err.style.color = "var(--red)";
        err.textContent = e.message;
      }
    });
  }

  function renderAppliances(list) {
    $("appliancesBody").innerHTML = list.length
      ? list
          .map(
            (a) => `<div class="pcard">
        <div class="cat">${esc(a.group)}</div>
        <h4>${esc(a.icon)} ${esc(a.name)}</h4>
        <div class="price">${a.watts} Вт</div>
        <div class="acts">
          <button class="btn-sm btn-ghost" data-edit-appl='${esc(JSON.stringify(a))}'>Редагувати</button>
          <button class="btn-sm btn-danger" data-del-appl="${esc(a.id)}">Видалити</button>
        </div></div>`
          )
          .join("")
      : `<div class="empty">Приладів немає</div>`;
    document.querySelectorAll("[data-edit-appl]").forEach((b) =>
      b.addEventListener("click", () => applianceModal(JSON.parse(b.dataset.editAppl)))
    );
    document.querySelectorAll("[data-del-appl]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Видалити прилад?")) return;
        try {
          await api("/api/calculator/appliances/" + b.dataset.delAppl, { method: "DELETE" });
          loadCalculator();
        } catch (err) {
          alert(err.message);
        }
      })
    );
  }

  function applianceModal(a) {
    const isNew = !a;
    a = a || { id: "", name: "", watts: 0, icon: "🔌", group: "essential" };
    openModal(`
      <h3>${isNew ? "Новий прилад" : "Редагувати прилад"}</h3>
      <div class="grid2">
        <div class="field"><label>ID</label><input id="a_id" value="${esc(a.id)}" ${isNew ? "" : "readonly"} /></div>
        <div class="field"><label>Іконка (емодзі)</label><input id="a_icon" value="${esc(a.icon)}" /></div>
      </div>
      <div class="field"><label>Назва</label><input id="a_name" value="${esc(a.name)}" /></div>
      <div class="grid2">
        <div class="field"><label>Потужність (Вт)</label><input id="a_watts" type="number" value="${esc(a.watts)}" /></div>
        <div class="field"><label>Група</label><select id="a_group">
          ${["essential", "kitchen", "heavy"].map((g) => `<option value="${g}" ${g === a.group ? "selected" : ""}>${g}</option>`).join("")}
        </select></div>
      </div>
      <div class="error" id="a_error"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="a_cancel">Скасувати</button>
        <button class="btn" id="a_save">Зберегти</button>
      </div>
    `);
    $("a_cancel").addEventListener("click", closeModal);
    $("a_save").addEventListener("click", async () => {
      const body = {
        id: $("a_id").value.trim(),
        name: $("a_name").value.trim(),
        icon: $("a_icon").value.trim() || "🔌",
        watts: Number($("a_watts").value) || 0,
        group: $("a_group").value,
      };
      try {
        await api("/api/calculator/appliances", { method: "POST", body: JSON.stringify(body) });
        closeModal();
        loadCalculator();
      } catch (err) {
        $("a_error").textContent = err.message;
      }
    });
  }

  $("addAppliance").addEventListener("click", () => applianceModal(null));

  // ── modal ──────────────────────────────────────────────────────────────────
  function openModal(html) {
    $("modal").innerHTML = html;
    $("modalBg").classList.add("open");
  }
  function closeModal() {
    $("modalBg").classList.remove("open");
    $("modal").innerHTML = "";
  }
  $("modalBg").addEventListener("click", (e) => {
    if (e.target === $("modalBg")) closeModal();
  });

  // ── bootstrap ────────────────────────────────────────────────────────────────
  (async function init() {
    if (!token) return;
    try {
      const me = await api("/api/auth/me");
      showApp(me.admin.email);
    } catch {
      logout();
    }
  })();
})();
