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
  let installerCache = [];
  let pricingCache = null;
  let crmLeadCache = [];
  let crmLastMovedId = null;
  let crmFilters = { waitingForStock: "all", type: "all", paymentStatus: "all", deliveryStatus: "all", managerId: "all" };
  let crmSearch = "";
  let crmStage = "all";
  let crmPrevStage = "all";
  let crmViewMode = "list";
  let crmProductOptions = [];
  let warehouseSubTab = "balance";
  let warehouseBalanceCache = [];
  let warehouseResCache = [];
  let warehouseFilters = { search: "", category: "all", brand: "all" };
  let warehouseResFilter = "all";
  let financeCache = { participants: [], sales: [] };
  let adminEmail = "";
  let currentAdmin = null;
  let managerCache = [];

  // ── helpers ────────────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => (n == null ? "—" : "$" + Number(n).toLocaleString("en-US"));
  const dt = (s) => new Date(s).toLocaleString("uk-UA", { dateStyle: "short", timeStyle: "short" });
  const uaDate = (s) => {
    if (!s) return "";
    const [year, month, day] = String(s).slice(0, 10).split("-");
    return `${day}.${month}.${year}`;
  };
  const isoDate = (s) => {
    if (!s.trim()) return "";
    const match = s.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return null;
    const [, day, month, year] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day)
      ? `${year}-${month}-${day}`
      : null;
  };
  const todayInKyiv = () => {
    const parts = new Intl.DateTimeFormat("uk-UA", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const part = (type) => parts.find((item) => item.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  };

  const TYPE_LABEL = { order: "Замовлення", consultation: "Консультація", callback: "Дзвінок" };
  const STATUS_LABEL = {
    new: "Необроблені",
    no_answer: "Недозвон",
    contacted: "Зв’язались",
    sourcing: "Шукаємо товар",
    proposal: "Пропозиція",
    won: "Успішно",
    lost: "Втрачено",
    in_progress: "Зв’язались",
    done: "Успішно",
  };
  const CRM_STATUSES = ["new", "no_answer", "contacted", "sourcing", "proposal", "won", "lost"];
  const PAYMENT_STATUS_LABEL = { unpaid: "Не оплачено", partial: "Частково оплачено", paid: "Оплачено" };
  const DELIVERY_STATUS_LABEL = { not_sent: "Не відправлено", preparing: "Готується", sent: "Відправлено", received: "Отримано", returned: "Повернено" };
  const statusOptions = (labels, selected) => Object.entries(labels).map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("");

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
  function showApp(admin) {
    currentAdmin = admin;
    adminEmail = admin.email;
    $("login").style.display = "none";
    $("app").style.display = "block";
    $("who").textContent = `${admin.name || admin.email}${admin.role === "manager" ? " · менеджер" : ""}`;
    document.querySelectorAll("[data-admin-only]").forEach((el) => { el.style.display = admin.role === "admin" ? "" : "none"; });
    if (admin.role === "admin") loadSeoSetting();
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
      showApp(data.admin);
    } catch (err) {
      $("loginError").textContent = err.message;
    }
  });
  $("logout").addEventListener("click", logout);

  // ── tabs ──────────────────────────────────────────────────────────────────
  const ALL_TABS = ["crm", "warehouse", "installers", "suppliers", "pricing", "products", "brands", "categories", "home", "testimonials", "content", "calculator", "security"];
  const MANAGER_TABS = ["crm", "warehouse", "installers", "pricing"];

  function activateTab(tab) {
    if (currentAdmin?.role === "manager" && !MANAGER_TABS.includes(tab)) tab = "crm";
    if (!ALL_TABS.includes(tab)) tab = "crm";
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
    if (btn) btn.classList.add("active");
    ALL_TABS.forEach((t) => { $("tab-" + t).style.display = t === tab ? "block" : "none"; });
    const url = new URL(location.href);
    url.searchParams.set("tab", tab);
    history.replaceState(null, "", url);
    if (tab === "crm") loadCrm();
    if (tab === "warehouse") loadWarehouse();
    if (tab === "installers") loadInstallers();
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
    if (!$("managerStatsMonth").value) $("managerStatsMonth").value = new Date().toISOString().slice(0, 7);
    loadManagers();
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
      currentAdmin = data.admin;
      adminEmail = data.admin.email;
      $("who").textContent = data.admin.name || adminEmail;
      $("securityCurrentPassword").value = "";
      $("securityNewPassword").value = "";
      $("securityConfirmPassword").value = "";
      $("securitySuccess").textContent = "Облікові дані оновлено. Новий пароль збережено як bcrypt-хеш.";
    } catch (err) {
      $("securityError").textContent = err.message;
    }
  });

  async function loadManagers() {
    if (currentAdmin?.role !== "admin") return;
    try {
      const [users, stats] = await Promise.all([
        api("/api/auth/users"),
        api("/api/leads/manager-stats?month=" + encodeURIComponent($("managerStatsMonth").value)),
      ]);
      managerCache = users;
      const totals = Object.fromEntries(stats.managers.map((row) => [row.id, row]));
      $("managersBody").innerHTML = users.length ? `<table><thead><tr><th>Менеджер</th><th>Доступ</th><th>Успішних</th><th>Продажі</th><th>Маржа</th><th>Ставка</th><th>Комісія</th><th></th></tr></thead><tbody>${users.map((user) => {
        const stat = totals[user.id] || { wonCount: 0, salesTotal: 0, salary: 0 };
        return `<tr><td><strong>${esc(user.name)}</strong><div class="muted">${esc(user.email)}</div></td><td><span class="badge ${user.active ? "s-paid" : "s-unpaid"}">${user.active ? "Активний" : "Вимкнений"}</span></td><td>${stat.wonCount}</td><td>${money(stat.salesTotal)}</td><td>${money(stat.margin || 0)}</td><td>10% від маржі</td><td><strong>${money(stat.salary)}</strong>${stat.pendingCostCount ? `<div class="muted">${stat.pendingCostCount} заявок без закупівлі — не нараховано</div>` : ""}</td><td><button class="btn-sm btn-ghost" data-edit-manager="${esc(user.id)}">Редагувати</button></td></tr>`;
      }).join("")}</tbody></table>` : `<div class="empty">Менеджерів ще немає</div>`;
      document.querySelectorAll("[data-edit-manager]").forEach((button) => button.addEventListener("click", () => managerModal(managerCache.find((user) => user.id === button.dataset.editManager))));
      renderCrmFilters();
    } catch (err) { $("managersBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
  }

  function managerModal(existing) {
    openModal(`<h3>${existing ? "Редагувати менеджера" : "Новий менеджер"}</h3>
      <div class="field"><label>Ім’я *</label><input id="manager_name" value="${esc(existing?.name || "")}"></div>
      <div class="field"><label>Email для входу *</label><input id="manager_email" type="email" value="${esc(existing?.email || "")}"></div>
      <div class="grid2"><div class="field"><label>${existing ? "Новий пароль" : "Пароль *"}</label><input id="manager_password" type="password" minlength="8" placeholder="Мінімум 8 символів"></div><div class="field"><label>Комісія від маржі</label><input id="manager_commission" type="number" value="10" readonly></div></div>
      ${existing ? `<label style="display:flex;gap:8px;align-items:center;margin:4px 0 16px"><input id="manager_active" type="checkbox" ${existing.active ? "checked" : ""}> Доступ активний</label>` : ""}
      <div class="error" id="manager_error"></div><div class="modal-actions"><button class="btn btn-ghost" id="manager_cancel">Скасувати</button><button class="btn" id="manager_save">Зберегти</button></div>`);
    $("manager_cancel").addEventListener("click", closeModal);
    $("manager_save").addEventListener("click", async () => {
      const password = $("manager_password").value;
      const body = { name: $("manager_name").value.trim(), email: $("manager_email").value.trim(), commissionPercent: Number($("manager_commission").value) || 0, ...(password ? { password } : {}), ...(existing ? { active: $("manager_active").checked } : {}) };
      if (!body.name || !body.email || (!existing && password.length < 8)) return $("manager_error").textContent = "Заповніть ім’я, email і пароль від 8 символів";
      try {
        await api(existing ? "/api/auth/users/" + existing.id : "/api/auth/users", { method: existing ? "PATCH" : "POST", body: JSON.stringify(body) });
        closeModal(); await loadManagers();
      } catch (err) { $("manager_error").textContent = err.message; }
    });
  }

  $("addManager").addEventListener("click", () => managerModal(null));
  $("managerStatsMonth").addEventListener("change", loadManagers);

  // ── CRM kanban ────────────────────────────────────────────────────────────
  $("refreshCrm").addEventListener("click", loadCrm);
  $("addCrmClient").addEventListener("click", openNewCrmClient);
  $("crmSearch").addEventListener("input", (e) => {
    const q = e.target.value;
    if (!crmSearch && q) crmPrevStage = crmStage;
    crmSearch = q;
    if (!crmSearch) crmStage = crmPrevStage;
    renderStageTabs();
    renderCrmContent(filteredLeads());
  });
  $("viewList").addEventListener("click", () => { crmViewMode = "list"; renderStageTabs(); renderCrmContent(filteredLeads()); });
  $("viewKanban").addEventListener("click", () => { crmViewMode = "kanban"; renderStageTabs(); renderCrmContent(filteredLeads()); });

  async function loadCrmProductOptions() {
    crmProductOptions = await api("/api/leads/product-options");
    return crmProductOptions;
  }

  const crmProductPickerHtml = () => `<div class="field"><label>Товари в заявці</label><input id="crm_product_search" type="search" autocomplete="off" placeholder="Пошук товару за назвою або моделлю…" style="margin-bottom:8px"><div class="grid2"><select id="crm_product_select"><option value="">— Оберіть товар —</option></select><input id="crm_product_quantity" type="number" min="1" value="1" placeholder="Кількість"></div><div id="crm_custom_product_wrap" style="display:none;margin-top:8px"><label for="crm_custom_product">Назва товару, якого немає в базі</label><input id="crm_custom_product" placeholder="Наприклад: інвертор Deye 10 кВт"></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn-sm btn-ghost" type="button" id="crm_add_product">+ Додати товар</button><button class="btn-sm btn-ghost" type="button" id="crm_add_custom_product">✎ Додати товар вручну</button></div><div id="crm_selected_products" style="margin-top:10px"></div></div>`;

  function setupCrmProductPicker(initialItems = [], onChange = () => {}) {
    const selected = initialItems.map((item) => ({ ...item }));
    const availabilityLabel = (availability) => availability === "in_stock" ? "є в наявності" : availability === "preorder" ? "очікується" : "немає в наявності";
    const renderProductOptions = (query = "") => {
      const normalizedQuery = query.trim().toLocaleLowerCase("uk-UA");
      const products = normalizedQuery ? crmProductOptions.filter((product) => product.name.toLocaleLowerCase("uk-UA").includes(normalizedQuery)) : crmProductOptions;
      $("crm_product_select").innerHTML = `<option value="">${products.length ? "— Оберіть товар —" : "Товарів не знайдено"}</option>${products.map((product) => `<option value="${esc(product.id)}">${esc(product.name)} · ${esc(product.stock?.availableQty > 0 || product.stock?.expectedQty > 0 ? stockLabel(product.stock) : product.supplierAvailability === "in_stock" ? "У постачальника" : availabilityLabel(product.availability))}</option>`).join("")}<option value="__custom__">Інший товар — немає в каталозі</option>`;
    };
    const render = () => {
      $("crm_selected_products").innerHTML = selected.length ? selected.map((item, index) => {
        const batches = (crmProductOptions.find((p) => p.id === item.id)?.batches || []).filter((b) => !b.arrivalDate && b.purchasePrice != null);
        const cost = item.purchasePrice ?? (item.warehouseItemId ? batches.find((b) => b.id === item.warehouseItemId)?.purchasePrice : new Set(batches.map((b) => b.purchasePrice)).size === 1 ? batches[0]?.purchasePrice : null);
        return `<div class="crm-sale-item"><div class="wh-detail-head"><strong>${esc(item.name)}</strong><button type="button" class="btn-sm btn-danger" data-remove-crm-product="${index}" aria-label="Видалити ${esc(item.name)}">×</button></div>
          <div class="grid2"><div class="field"><label for="sale_qty_${index}">Кількість</label><input id="sale_qty_${index}" data-sale-qty="${index}" type="number" min="1" step="1" value="${item.quantity}"></div><div class="field"><label for="sale_price_${index}">Ціна продажу за шт., $</label><input id="sale_price_${index}" data-sale-price="${index}" type="number" min="0" step="1" value="${item.price}"></div></div>
          <div class="grid2"><div class="field"><label for="sale_serial_${index}">Серійний номер${item.quantity > 1 ? "и" : ""}</label><textarea id="sale_serial_${index}" data-sale-serial="${index}" maxlength="2000" rows="2" placeholder="Для кількох одиниць — кожен номер з нового рядка">${esc(item.serialNumber || "")}</textarea></div><div class="field"><label for="sale_location_${index}">Місце закупівлі</label><input id="sale_location_${index}" data-sale-location="${index}" maxlength="500" value="${esc(item.purchaseLocation || "")}" placeholder="Постачальник, магазин або склад"></div></div>
          <div class="field"><label for="sale_batch_${index}">Партія / закупівля за шт.</label><select id="sale_batch_${index}" data-sale-batch="${index}"><option value="">${item.purchasePrice != null && !item.warehouseItemId ? `Збережена закупівля ${money(item.purchasePrice)}` : "Автоматично, якщо ціна однозначна"}</option>${item.warehouseItemId && !batches.some((b) => b.id === item.warehouseItemId) ? `<option value="${esc(item.warehouseItemId)}" selected>Збережена партія · ${money(item.purchasePrice)}</option>` : ""}${batches.map((batch) => `<option value="${esc(batch.id)}" ${batch.id === item.warehouseItemId ? "selected" : ""}>${esc(batch.supplierName)} · ${money(batch.purchasePrice)} · залишок ${batch.quantity} шт.</option>`).join("")}</select></div>
          <div class="muted">${cost != null ? `Закупівля: ${money(cost)} × ${item.quantity} = ${money(cost * item.quantity)}` : "Потрібна ціна закупівлі: виберіть партію або задайте її на складі. Комісію ще не нараховано."}</div></div>`;
      }).join("") : `<div class="muted">Товари ще не додані</div>`;
      document.querySelectorAll("[data-remove-crm-product]").forEach((button) => button.addEventListener("click", () => { selected.splice(Number(button.dataset.removeCrmProduct), 1); render(); onChange(selected); }));
      document.querySelectorAll("[data-sale-qty], [data-sale-price]").forEach((input) => input.addEventListener("input", () => {
        const isQty = input.dataset.saleQty !== undefined;
        const index = Number(isQty ? input.dataset.saleQty : input.dataset.salePrice);
        const value = Number(input.value);
        if (input.value === "" || !Number.isSafeInteger(value) || value < (isQty ? 1 : 0)) return;
        selected[index][isQty ? "quantity" : "price"] = value;
        onChange(selected);
      }));
      document.querySelectorAll("[data-sale-serial], [data-sale-location]").forEach((input) => input.addEventListener("input", () => {
        const serial = input.dataset.saleSerial !== undefined;
        const index = Number(serial ? input.dataset.saleSerial : input.dataset.saleLocation);
        selected[index][serial ? "serialNumber" : "purchaseLocation"] = input.value;
      }));
      document.querySelectorAll("[data-sale-batch]").forEach((input) => input.addEventListener("change", () => {
        const item = selected[Number(input.dataset.saleBatch)];
        item.warehouseItemId = input.value || null;
        const batch = crmProductOptions.find((p) => p.id === item.id)?.batches?.find((b) => b.id === input.value);
        if (!item.purchaseLocation?.trim() && batch?.supplierName && batch.supplierName !== "Без постачальника") item.purchaseLocation = batch.supplierName;
        delete item.purchasePrice;
        render(); onChange(selected, false);
      }));
    };
    renderProductOptions();
    $("crm_product_search").addEventListener("input", () => {
      renderProductOptions($("crm_product_search").value);
      $("crm_custom_product_wrap").style.display = "none";
    });
    $("crm_product_search").addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const availableOptions = [...$("crm_product_select").options].filter((option) => option.value && option.value !== "__custom__");
      if (availableOptions.length === 1) $("crm_product_select").value = availableOptions[0].value;
    });
    $("crm_product_select").addEventListener("change", () => { $("crm_custom_product_wrap").style.display = $("crm_product_select").value === "__custom__" ? "block" : "none"; });
    $("crm_add_custom_product").addEventListener("click", () => {
      $("crm_product_select").value = "__custom__";
      $("crm_custom_product_wrap").style.display = "block";
      $("crm_custom_product").focus();
    });
    $("crm_add_product").addEventListener("click", () => {
      const id = $("crm_product_select").value; const quantity = Number($("crm_product_quantity").value);
      if (!Number.isSafeInteger(quantity) || quantity < 1) return alert("Вкажіть цілу додатну кількість");
      if (!id) return;
      if (id === "__custom__") {
        const name = $("crm_custom_product").value.trim(); if (!name) return alert("Вкажіть назву товару");
        selected.push({ id: `custom-${Date.now()}`, name, price: 0, quantity, availability: "unavailable", custom: true });
      } else {
        const product = crmProductOptions.find((option) => option.id === id); if (!product) return;
        selected.push({ id: product.id, name: product.name, price: product.price, quantity, availability: product.availability });
      }
      $("crm_product_search").value = ""; renderProductOptions(); $("crm_custom_product").value = ""; $("crm_custom_product_wrap").style.display = "none"; render(); onChange(selected);
    });
    render();
    return () => {
      const invalid = [...document.querySelectorAll("[data-sale-qty], [data-sale-price]")].find((input) => input.value === "" || !input.checkValidity());
      if (invalid) throw new Error("Перевірте кількість та ціну товарів");
      return selected;
    };
  }

  function showWonItemsModal(lead) {
    return new Promise((resolve) => {
      const selected = [];
      const availLabel = (a) => a === "in_stock" ? "є в наявності" : a === "preorder" ? "очікується" : "немає";
      const renderOpts = (query = "") => {
        const q = query.trim().toLocaleLowerCase("uk-UA");
        const products = q ? crmProductOptions.filter((p) => p.name.toLocaleLowerCase("uk-UA").includes(q)) : crmProductOptions;
        const el = document.getElementById("won_select");
        if (el) el.innerHTML = `<option value="">${products.length ? "— Оберіть товар —" : "Не знайдено"}</option>${products.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} · ${availLabel(p.availability)}</option>`).join("")}`;
      };
      const renderSelected = () => {
        const el = document.getElementById("won_selected");
        if (!el) return;
        el.innerHTML = selected.length
          ? selected.map((item, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:#f8fafc;border-radius:7px;margin-top:4px"><span>${esc(item.name)} × ${item.qty} · ${money(item.price * item.qty)}</span><button type="button" class="btn-sm btn-danger" data-ri="${i}">×</button></div>`).join("")
          : `<div class="muted" style="margin-top:6px">Товари не додано</div>`;
        el.querySelectorAll("[data-ri]").forEach((btn) => btn.addEventListener("click", () => { selected.splice(Number(btn.dataset.ri), 1); renderSelected(); }));
      };
      openModal(`<h3>Додати товари до продажу</h3>
        <p style="margin-bottom:14px;color:var(--slate-500)">Клієнт: <strong>${esc(lead.name)}</strong> — вкажіть що продано перед закриттям угоди.</p>
        <div class="field"><label>Пошук товару</label>
          <input id="won_search" type="search" autocomplete="off" placeholder="Назва або модель…" style="margin-bottom:8px">
          <div style="display:flex;gap:8px">
            <select id="won_select" style="flex:1;padding:10px;border:1px solid var(--slate-200);border-radius:8px;font-size:14px;font-family:inherit"></select>
            <input id="won_qty" type="number" min="1" value="1" style="width:72px;padding:10px;border:1px solid var(--slate-200);border-radius:8px">
            <button type="button" class="btn btn-sm" id="won_add_btn">+ Додати</button>
          </div>
        </div>
        <div id="won_selected"></div>
        <div class="error" id="won_error"></div>
        <div class="modal-actions"><button class="btn btn-ghost" id="won_cancel">Скасувати</button><button class="btn" id="won_confirm">Закрити угоду ✓</button></div>`);
      renderOpts();
      renderSelected();
      document.getElementById("won_search").addEventListener("input", (e) => renderOpts(e.target.value));
      document.getElementById("won_add_btn").addEventListener("click", () => {
        const productId = document.getElementById("won_select").value;
        const qty = Math.max(1, parseInt(document.getElementById("won_qty").value, 10) || 1);
        if (!productId) return;
        const product = crmProductOptions.find((p) => p.id === productId);
        if (!product) return;
        const existing = selected.find((s) => s.id === productId);
        if (existing) existing.qty += qty; else selected.push({ id: product.id, name: product.name, price: product.price, qty, availability: product.availability });
        document.getElementById("won_qty").value = "1";
        renderSelected();
      });
      document.getElementById("won_cancel").addEventListener("click", () => { closeModal(); resolve(null); });
      document.getElementById("won_confirm").addEventListener("click", () => {
        if (!selected.length) return (document.getElementById("won_error").textContent = "Додайте хоча б один товар");
        closeModal();
        resolve(selected.map((s) => ({ id: s.id, name: s.name, price: s.price, quantity: s.qty, availability: s.availability })));
      });
    });
  }

  function showReserveProductModal(lead, status) {
    return new Promise((resolve) => {
      const statusLabel = STATUS_LABEL[status] || status;
      const selected = [];
      const availLabel = (a) => a === "in_stock" ? "є в наявності" : a === "preorder" ? "очікується" : "немає";
      const renderOpts = (query = "") => {
        const q = query.trim().toLocaleLowerCase("uk-UA");
        const products = q ? crmProductOptions.filter((p) => p.name.toLocaleLowerCase("uk-UA").includes(q)) : crmProductOptions;
        const el = document.getElementById("resv_select");
        if (el) el.innerHTML = `<option value="">${products.length ? "— Оберіть товар —" : "Не знайдено"}</option>${products.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} · ${availLabel(p.availability)}</option>`).join("")}`;
      };
      const renderSelected = () => {
        const el = document.getElementById("resv_selected");
        if (!el) return;
        el.innerHTML = selected.length
          ? selected.map((item, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:#f8fafc;border-radius:7px;margin-top:4px"><span>${esc(item.name)} × ${item.qty}</span><button type="button" class="btn-sm btn-danger" data-ri="${i}">×</button></div>`).join("")
          : `<div class="muted" style="margin-top:6px">Товари не додано</div>`;
        el.querySelectorAll("[data-ri]").forEach((btn) => btn.addEventListener("click", () => { selected.splice(Number(btn.dataset.ri), 1); renderSelected(); }));
      };
      openModal(`<h3>Зарезервувати товари</h3>
        <p style="margin-bottom:14px;color:var(--slate-500)">Клієнт: <strong>${esc(lead.name)}</strong> → <strong>${esc(statusLabel)}</strong></p>
        <div class="field"><label>Пошук товару</label>
          <input id="resv_search" type="search" autocomplete="off" placeholder="Назва або модель…" style="margin-bottom:8px">
          <div style="display:flex;gap:8px">
            <select id="resv_select" style="flex:1;padding:10px;border:1px solid var(--slate-200);border-radius:8px;font-size:14px;font-family:inherit"></select>
            <input id="resv_qty" type="number" min="1" value="1" style="width:72px;padding:10px;border:1px solid var(--slate-200);border-radius:8px">
            <button type="button" class="btn btn-sm" id="resv_add_btn">+ Додати</button>
          </div>
        </div>
        <div id="resv_selected"></div>
        <div class="error" id="resv_error"></div>
        <div class="modal-actions"><button class="btn btn-ghost" id="resv_cancel">Скасувати</button><button class="btn" id="resv_confirm">Зарезервувати</button></div>`);
      renderOpts();
      renderSelected();
      document.getElementById("resv_search").addEventListener("input", (e) => renderOpts(e.target.value));
      document.getElementById("resv_add_btn").addEventListener("click", () => {
        const productId = document.getElementById("resv_select").value;
        const qty = Math.max(1, parseInt(document.getElementById("resv_qty").value, 10) || 1);
        if (!productId) return;
        const product = crmProductOptions.find((p) => p.id === productId);
        if (!product) return;
        const existing = selected.find((s) => s.id === productId);
        if (existing) existing.qty += qty; else selected.push({ id: product.id, name: product.name, qty });
        document.getElementById("resv_qty").value = "1";
        renderSelected();
      });
      document.getElementById("resv_cancel").addEventListener("click", () => { closeModal(); resolve(null); });
      document.getElementById("resv_confirm").addEventListener("click", () => {
        if (!selected.length) return (document.getElementById("resv_error").textContent = "Додайте хоча б один товар");
        closeModal();
        resolve(selected.map((s) => ({ productId: s.id, quantity: s.qty })));
      });
    });
  }

  function callbackLocalValue(value) {
    if (!value) return "";
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function callbackFields(lead = {}) {
    return `<div class="field" style="padding:12px;background:#eff6ff;border-radius:8px">
      <label for="crm_callback_at">⏰ Передзвонити — дата й час</label>
      <input type="datetime-local" id="crm_callback_at" value="${callbackLocalValue(lead.callbackAt)}">
      <div class="muted" style="margin-top:6px">Часовий пояс: ${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}. Нагадування прийде в Telegram-групу.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><button type="button" class="btn-sm btn-ghost" id="crm_callback_clear">Скасувати нагадування</button></div>
      <label for="crm_callback_note">Про що нагадати</label><input id="crm_callback_note" maxlength="1000" value="${esc(lead.callbackNote || "")}" placeholder="Наприклад: обговорити комплект і ціну">
      ${lead.callbackSentAt ? `<div class="muted">Нагадування надіслано ${dt(lead.callbackSentAt)}. Для нового дзвінка оберіть інший час.</div>` : ""}
    </div>`;
  }

  function setupCallbackFields() {
    $("crm_callback_clear").addEventListener("click", () => { $("crm_callback_at").value = ""; });
  }

  function callbackPayload(lead = {}) {
    const value = $("crm_callback_at").value;
    const unchanged = value === callbackLocalValue(lead.callbackAt);
    const date = value ? new Date(value) : null;
    if (date && (!Number.isFinite(date.getTime()) || (!unchanged && date <= new Date()))) throw new Error("Оберіть майбутню дату й час передзвону");
    return { callbackAt: unchanged ? (lead.callbackAt || null) : date?.toISOString() || null, callbackNote: $("crm_callback_note").value.trim() };
  }

  function callbackBadge(lead) {
    return lead.callbackAt ? `<div style="margin-top:8px;font-size:12px;overflow-wrap:anywhere;color:${lead.callbackSentAt ? "#64748b" : "#1d4ed8"}">${lead.callbackSentAt ? "✓ Нагадування надіслано" : "⏰ Передзвонити"}: ${dt(lead.callbackAt)}</div>` : "";
  }

  function stockWaitingFields(lead = {}) {
    return `<div class="field" style="padding:12px;background:#fffbeb;border-radius:8px">
      <label style="display:flex;align-items:center;gap:8px"><input id="crm_waiting_stock" type="checkbox" style="width:auto" ${lead.waitingForStock ? "checked" : ""}>Передзвонити при появі товару</label>
      <label for="crm_waiting_product">Який товар або модель чекає клієнт</label>
      <input id="crm_waiting_product" maxlength="500" value="${esc(lead.waitingProduct || "")}" placeholder="Наприклад: Deye SUN-12K або акумулятор 10 кВт·год">
      <div class="muted" style="margin-top:6px">Після дзвінка зніміть позначку та збережіть картку.</div>
    </div>`;
  }

  function stockWaitingBadge(lead) {
    return lead.waitingForStock ? `<div style="margin-top:8px;overflow-wrap:anywhere"><span class="badge" style="background:#fef3c7;color:#92400e">🔔 Чекає наявності</span>${lead.waitingProduct ? `<div style="font-size:12px;margin-top:4px">${esc(lead.waitingProduct)}</div>` : ""}</div>` : "";
  }

  function reservationBadge(lead) {
    const list = lead.reservations;
    if (!list || !list.length) return "";
    return list.map((r) => {
      const name = r.product?.name ? esc(r.product.name) : "";
      if (r.status === "searching") return `<div style="margin-top:4px"><span class="badge" style="background:#fde68a;color:#78350f">🔍 Шукаємо: ${name}</span></div>`;
      if (r.status === "active") return `<div style="margin-top:4px"><span class="badge" style="background:#d1fae5;color:#065f46">📦 ${name}</span></div>`;
      if (r.status === "found") return `<div style="margin-top:4px"><span class="badge" style="background:#bbf7d0;color:#14532d">✅ ${name}</span></div>`;
      return "";
    }).join("");
  }

  async function openNewCrmClient() {
    try { await loadCrmProductOptions(); } catch (err) { return alert(err.message); }
    openModal(`<h3>Новий клієнт</h3>
      <div class="grid2"><div class="field"><label>Ім’я *</label><input id="new_client_name"></div><div class="field"><label>Телефон *</label><input id="new_client_phone"></div></div>
      <div class="grid2"><div class="field"><label>Email</label><input id="new_client_email" type="email"></div><div class="field"><label>Тип звернення</label><select id="new_client_type"><option value="consultation">Консультація</option><option value="order">Замовлення</option><option value="callback">Зворотний дзвінок</option></select></div></div>
      <div class="field"><label>Що цікавить</label><input id="new_client_interest" placeholder="Наприклад: комплект для будинку"></div>
      ${crmProductPickerHtml()}
      ${stockWaitingFields()}
      ${callbackFields()}
      <div class="field"><label>Сума продажу, $</label><input id="new_client_total" type="number" min="0" step="1" placeholder="Заповниться з товарів автоматично"></div>
      <div class="field"><label>Етап</label><select id="new_client_status">${CRM_STATUSES.map((s) => `<option value="${s}">${STATUS_LABEL[s]}</option>`).join("")}</select></div>
      ${currentAdmin?.role === "admin" ? `<div class="field"><label>Відповідальний менеджер</label><select id="new_client_manager"><option value="">Не призначено</option>${managerCache.filter((m) => m.active).map((m) => `<option value="${esc(m.id)}">${esc(m.name || m.email)}</option>`).join("")}</select></div>` : ""}
      <div class="grid2"><div class="field"><label>Оплата</label><select id="new_client_payment_status">${statusOptions(PAYMENT_STATUS_LABEL, "unpaid")}</select></div><div class="field"><label>Доставка</label><select id="new_client_delivery_status">${statusOptions(DELIVERY_STATUS_LABEL, "not_sent")}</select></div></div>
      <div class="field"><label>Нотатки менеджера</label><textarea id="new_client_notes" rows="4"></textarea></div>
      <div class="error" id="new_client_error"></div><div class="modal-actions"><button class="btn btn-ghost" id="new_client_cancel">Скасувати</button><button class="btn" id="new_client_save">Додати</button></div>`);
    setupCallbackFields();
    const getProducts = setupCrmProductPicker();
    $("new_client_cancel").addEventListener("click", closeModal);
    $("new_client_save").addEventListener("click", async () => {
      const items = getProducts();
      const calculatedTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const body = { waitingForStock: $("crm_waiting_stock").checked, waitingProduct: $("crm_waiting_product").value.trim(), type: $("new_client_type").value, name: $("new_client_name").value.trim(), phone: $("new_client_phone").value.trim(), email: $("new_client_email").value.trim(), interest: $("new_client_interest").value.trim(), items, total: $("new_client_total").value === "" ? calculatedTotal : Number($("new_client_total").value), status: $("new_client_status").value, paymentStatus: $("new_client_payment_status").value, deliveryStatus: $("new_client_delivery_status").value, notes: $("new_client_notes").value, ...(currentAdmin?.role === "admin" ? { managerId: $("new_client_manager").value || null } : {}) };
      try { Object.assign(body, callbackPayload()); await api("/api/leads/admin", { method: "POST", body: JSON.stringify(body) }); closeModal(); loadCrm(); }
      catch (err) { $("new_client_error").textContent = err.message; }
    });
  }

  function normalizeLeadStatus(status) {
    if (status === "in_progress") return "contacted";
    if (status === "done") return "won";
    return CRM_STATUSES.includes(status) ? status : "new";
  }

  function filteredLeads() {
    const q = crmSearch.trim().toLocaleLowerCase("uk-UA");
    return crmLeadCache.filter((l) => {
      if (crmFilters.waitingForStock === "waiting" && !l.waitingForStock) return false;
      if (crmFilters.type !== "all" && l.type !== crmFilters.type) return false;
      if (crmFilters.paymentStatus !== "all" && (l.paymentStatus || "unpaid") !== crmFilters.paymentStatus) return false;
      if (crmFilters.deliveryStatus !== "all" && (l.deliveryStatus || "not_sent") !== crmFilters.deliveryStatus) return false;
      if (crmFilters.managerId === "unassigned" && l.managerId) return false;
      if (crmFilters.managerId !== "all" && crmFilters.managerId !== "unassigned" && l.managerId !== crmFilters.managerId) return false;
      if (q) {
        return (l.name || "").toLocaleLowerCase("uk-UA").includes(q) ||
               (l.phone || "").toLocaleLowerCase("uk-UA").includes(q) ||
               (l.notes || "").toLocaleLowerCase("uk-UA").includes(q) ||
               (l.interest || "").toLocaleLowerCase("uk-UA").includes(q) ||
               (l.waitingProduct || "").toLocaleLowerCase("uk-UA").includes(q);
      }
      if (crmStage !== "all") return normalizeLeadStatus(l.status) === crmStage;
      return true;
    });
  }

  function renderCrmFilters() {
    const el = $("crmFilters");
    if (!el) return;
    const typeOpts = [["all", "Всі типи"], ...Object.entries(TYPE_LABEL)];
    const payOpts = [["all", "Будь-яка оплата"], ...Object.entries(PAYMENT_STATUS_LABEL)];
    const delOpts = [["all", "Будь-яка доставка"], ...Object.entries(DELIVERY_STATUS_LABEL)];
    const chips = (opts, key) => opts.map(([v, l]) =>
      `<button class="filter-chip${crmFilters[key] === v ? " active" : ""}" data-filter="${key}" data-value="${v}">${l}</button>`
    ).join("");
    const managerFilter = `<div class="filter-sep"></div><select id="crmManagerFilter" style="padding:6px 10px;border:1px solid var(--slate-200);border-radius:8px;background:#fff"><option value="all" ${crmFilters.managerId === "all" ? "selected" : ""}>Усі менеджери</option><option value="unassigned" ${crmFilters.managerId === "unassigned" ? "selected" : ""}>Не призначено</option>${managerCache.map((manager) => `<option value="${esc(manager.id)}" ${crmFilters.managerId === manager.id ? "selected" : ""}>${esc(manager.name || manager.email)}</option>`).join("")}</select>`;
    el.innerHTML = `<div class="filter-group">${chips(typeOpts, "type")}</div><div class="filter-sep"></div><div class="filter-group">${chips(payOpts, "paymentStatus")}</div><div class="filter-sep"></div><div class="filter-group">${chips(delOpts, "deliveryStatus")}</div>${managerFilter}<div class="filter-sep"></div><div class="filter-group">${chips([["all", "Усі за наявністю"], ["waiting", "🔔 Чекають наявності"]], "waitingForStock")}</div>`;
    el.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        crmFilters[chip.dataset.filter] = chip.dataset.value;
        renderCrmFilters();
        renderCrmContent(filteredLeads());
      });
    });
    const managerSelect = $("crmManagerFilter");
    if (managerSelect) managerSelect.addEventListener("change", () => { crmFilters.managerId = managerSelect.value; renderCrmContent(filteredLeads()); });
  }

  async function loadCrm() {
    try {
      managerCache = await api(currentAdmin?.role === "admin" ? "/api/auth/users" : "/api/leads/managers");
      const leads = await api("/api/leads?type=all&status=all");
      crmLeadCache = leads;
      crmLastMovedId = null;
      const counts = Object.fromEntries(CRM_STATUSES.map((s) => [s, 0]));
      leads.forEach((l) => counts[normalizeLeadStatus(l.status)]++);
      $("crmStats").innerHTML = [
        ["Усього клієнтів", leads.length],
        ["Необроблені", counts.new],
        ["У роботі", counts.contacted + counts.sourcing + counts.proposal],
        ["Успішні", counts.won],
        ["Втрачено", counts.lost],
      ].map(([label, value]) => `<div class="stat"><div class="n">${value}</div><div class="l">${label}</div></div>`).join("");
      renderStageTabs();
      renderCrmFilters();
      renderCrmContent(filteredLeads());
      const url = new URL(location.href);
      const linkedId = url.searchParams.get("lead");
      if (linkedId) {
        url.searchParams.delete("lead"); history.replaceState(null, "", url);
        const linked = leads.find((lead) => lead.id === linkedId);
        if (!linked) alert("Картку клієнта не знайдено");
        else if (currentAdmin?.role === "admin" || linked.managerId === currentAdmin?.id) await openLead(linked);
        else alert("Картка доступна відповідальному менеджеру або адміністратору");
      }
    } catch (err) {
      $("kanbanBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`;
    }
  }

  function leadActionsHtml(lead) {
    const isAdmin = currentAdmin?.role === "admin";
    const isMine = lead.managerId === currentAdmin?.id;
    if (isAdmin || isMine) return `<button class="btn-sm btn-ghost" data-open-lead="${esc(lead.id)}">Відкрити</button>`;
    if (!lead.managerId) return `<button class="btn-sm" data-claim-lead="${esc(lead.id)}">Взяти собі</button>`;
    return `<button class="btn-sm" data-claim-lead="${esc(lead.id)}" data-previous-manager="${esc(lead.managerId)}">Перебрати собі</button>`;
  }

  function bindLeadActions() {
    document.querySelectorAll("[data-claim-lead]").forEach((button) => button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await api("/api/leads/" + button.dataset.claimLead, { method: "PATCH", body: JSON.stringify({ managerId: currentAdmin.id, expectedManagerId: button.dataset.previousManager || null }) });
        await loadCrm();
      } catch (err) { alert(err.message); await loadCrm(); }
    }));
    document.querySelectorAll("[data-open-lead]").forEach((button) =>
      button.addEventListener("click", () => openLead(crmLeadCache.find((lead) => lead.id === button.dataset.openLead)))
    );
  }

  function renderKanban(leads) {
    const statuses = crmSearch.trim() || crmStage === "all" ? CRM_STATUSES : [crmStage];
    const board = $("kanbanBody");
    board.classList.toggle("kanban-filtered", statuses.length === 1);
    board.innerHTML = statuses.map((status) => {
      const rows = leads.filter((l) => normalizeLeadStatus(l.status) === status);
      rows.sort((a, b) => (b.id === crmLastMovedId ? 1 : 0) - (a.id === crmLastMovedId ? 1 : 0));
      const cards = rows.map((l) => {
        const details = l.interest || (l.items && l.items.length ? `${l.items.length} товар(и)` : TYPE_LABEL[l.type] || l.type);
        const managerLine = status === "won" ? `Продаж: ${l.soldBy?.name || l.soldBy?.email || "не вказано"}` : `Менеджер: ${l.manager?.name || l.manager?.email || "не призначено"}`;
        const canMove = currentAdmin?.role === "admin" || l.managerId === currentAdmin?.id;
        return `<article class="lead-card" draggable="${canMove ? "true" : "false"}" data-lead-id="${esc(l.id)}">
          <span class="badge b-${esc(l.type)}">${esc(TYPE_LABEL[l.type] || l.type)}</span>
          <h4>${esc(l.name)}</h4>
          ${stockWaitingBadge(l)}
          ${reservationBadge(l)}
          ${callbackBadge(l)}
          <div class="lead-meta"><a href="tel:${esc(l.phone)}">${esc(l.phone)}</a><br>${esc(details || "Без деталей")}<br>${dt(l.createdAt)}</div>
          <div style="font-size:12px;font-weight:700;margin-top:7px">${esc(managerLine)}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px"><span class="badge s-${esc(l.paymentStatus || "unpaid")}">${esc(PAYMENT_STATUS_LABEL[l.paymentStatus] || PAYMENT_STATUS_LABEL.unpaid)}</span><span class="badge s-${esc(l.deliveryStatus || "not_sent")}">${esc(DELIVERY_STATUS_LABEL[l.deliveryStatus] || DELIVERY_STATUS_LABEL.not_sent)}</span></div>
          ${l.notes ? `<div class="items">${esc(l.notes).slice(0, 90)}</div>` : ""}
          <div class="lead-actions">${leadActionsHtml(l)}</div>
        </article>`;
      }).join("");
      return `<div class="kanban-col" data-drop-status="${status}">
        <div class="kanban-head"><span>${STATUS_LABEL[status]}</span><span class="kanban-count">${rows.length}</span></div>
        <div class="kanban-list">${cards || `<div class="empty" style="padding:30px 5px">Немає клієнтів</div>`}</div>
      </div>`;
    }).join("");

    document.querySelectorAll('.lead-card[draggable="true"]').forEach((card) => {
      card.addEventListener("dragstart", () => card.classList.add("dragging"));
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
    });
    document.querySelectorAll("[data-drop-status]").forEach((col) => {
      col.addEventListener("dragover", (e) => e.preventDefault());
      col.addEventListener("drop", async (e) => {
        e.preventDefault();
        const card = document.querySelector(".lead-card.dragging");
        if (!card) return;
        const leadId = card.dataset.leadId;
        const newStatus = col.dataset.dropStatus;
        const lead = crmLeadCache.find((l) => l.id === leadId);
        if (!lead) return;
        const RESERVE_STATUSES = ["contacted", "sourcing", "proposal"];
        if (RESERVE_STATUSES.includes(newStatus) && !lead.reservations?.length) {
          try {
            await loadCrmProductOptions();
            const reservedProducts = await showReserveProductModal(lead, newStatus);
            if (!reservedProducts) { card.classList.remove("dragging"); return; }
            lead.status = newStatus;
            crmLastMovedId = leadId;
            renderKanban(filteredLeads());
            const updated = await api("/api/leads/" + leadId, { method: "PATCH", body: JSON.stringify({ status: newStatus, reservedProducts }) });
            const index = crmLeadCache.findIndex((row) => row.id === leadId);
            if (index >= 0) crmLeadCache[index] = updated;
            renderKanban(filteredLeads());
          } catch (err) { alert(err.message); loadCrm(); }
          return;
        }
        if (newStatus === "won" && !lead.items?.length && !lead.reservations?.length) {
          try {
            await loadCrmProductOptions();
            const items = await showWonItemsModal(lead);
            if (!items) { card.classList.remove("dragging"); return; }
            lead.status = newStatus;
            crmLastMovedId = leadId;
            renderKanban(filteredLeads());
            const updated = await api("/api/leads/" + leadId, { method: "PATCH", body: JSON.stringify({ status: newStatus, items }) });
            const index = crmLeadCache.findIndex((row) => row.id === leadId);
            if (index >= 0) crmLeadCache[index] = updated;
            renderKanban(filteredLeads());
          } catch (err) { alert(err.message); loadCrm(); }
          return;
        }
        if (lead) lead.status = newStatus;
        crmLastMovedId = leadId;
        renderKanban(filteredLeads());
        try {
          const updated = await api("/api/leads/" + leadId, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
          const index = crmLeadCache.findIndex((row) => row.id === leadId);
          if (index >= 0) crmLeadCache[index] = updated;
          renderKanban(filteredLeads());
        } catch (err) { alert(err.message); loadCrm(); }
      });
    });
    bindLeadActions();
  }

  function renderStageTabs() {
    const tabsEl = document.getElementById("crmStageTabs");
    if (!tabsEl) return;
    const stageCounts = Object.fromEntries(CRM_STATUSES.map((s) => [s, 0]));
    crmLeadCache.forEach((l) => stageCounts[normalizeLeadStatus(l.status)]++);
    const stages = [["all", "Усі", crmLeadCache.length], ...CRM_STATUSES.map((s) => [s, STATUS_LABEL[s], stageCounts[s]])];
    const isSearching = !!crmSearch.trim();
    tabsEl.innerHTML = stages.map(([val, label, count]) =>
      `<button class="stage-tab${crmStage === val && !isSearching ? " active" : ""}" data-stage="${val}">${esc(label)}<span class="cnt">${count}</span></button>`
    ).join("");
    tabsEl.querySelectorAll(".stage-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        crmSearch = "";
        const searchEl = document.getElementById("crmSearch");
        if (searchEl) searchEl.value = "";
        crmStage = btn.dataset.stage;
        crmPrevStage = crmStage;
        renderStageTabs();
        renderCrmContent(filteredLeads());
      });
    });
    const vl = document.getElementById("viewList");
    const vk = document.getElementById("viewKanban");
    if (vl && vk) {
      vl.style.background = crmViewMode === "list" ? "var(--slate-900)" : "#fff";
      vl.style.color = crmViewMode === "list" ? "#fff" : "var(--slate-500)";
      vk.style.background = crmViewMode === "kanban" ? "var(--slate-900)" : "#fff";
      vk.style.color = crmViewMode === "kanban" ? "#fff" : "var(--slate-500)";
    }
  }

  function renderCrmContent(leads) {
    const el = $("kanbanBody");
    if (crmViewMode === "kanban") {
      el.className = "kanban";
      renderKanban(leads);
    } else {
      el.className = "crm-list";
      renderList(leads);
    }
  }

  function renderList(leads) {
    const el = $("kanbanBody");
    const isSearching = !!crmSearch.trim();
    if (!leads.length) {
      el.innerHTML = `<div class="empty" style="padding:48px;text-align:center">Нічого не знайдено</div>`;
      return;
    }
    const NOTES_LIMIT = 250;
    el.innerHTML = leads.map((l) => {
      const stage = normalizeLeadStatus(l.status);
      const details = l.interest || (l.items && l.items.length ? `${l.items.length} товар(и)` : TYPE_LABEL[l.type] || l.type);
      const showStage = isSearching || crmStage === "all";
      const stageHtml = showStage ? ` <span class="client-stage-label">· ${esc(STATUS_LABEL[stage])}</span>` : "";
      const truncated = l.notes && l.notes.length > NOTES_LIMIT;
      const canEdit = currentAdmin?.role === "admin" || l.managerId === currentAdmin?.id;
      const notesHtml = l.notes
        ? (truncated
          ? `<div class="notes-clamp" id="ntxt-${esc(l.id)}">${esc(l.notes.slice(0, NOTES_LIMIT))}…</div><button class="notes-more" data-expand="${esc(l.id)}">Більше</button>`
          : `<div class="notes-clamp">${esc(l.notes)}</div>`)
        : canEdit ? `<button class="add-notes-btn" data-add-notes="${esc(l.id)}">Додати опис</button>` : `<span class="muted">Немає нотаток</span>`;
      const managerName = stage === "won" ? (l.soldBy?.name || l.soldBy?.email || "Не вказано") : (l.manager?.name || l.manager?.email || "Не призначено");
      return `<div class="crm-row">
        <div>
          <div><span class="badge b-${esc(l.type)}">${esc(TYPE_LABEL[l.type] || l.type)}</span></div>
          <div class="client-name">${esc(l.name)}${stageHtml}</div>
          ${stockWaitingBadge(l)}
          ${reservationBadge(l)}
          ${callbackBadge(l)}
          <a href="tel:${esc(l.phone)}" style="color:var(--blue);font-size:13px">${esc(l.phone)}</a>
        </div>
        <div>
          <div style="font-size:13px;color:var(--slate-700)">${esc(details || "")}</div>
          <div style="font-size:12px;color:var(--slate-400);margin-top:3px">${dt(l.createdAt)}</div>
        </div>
        <div><div class="muted" style="font-size:11px">${stage === "won" ? "Продав" : "Менеджер"}</div><strong style="font-size:13px">${esc(managerName)}</strong></div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <span class="badge s-${esc(l.paymentStatus || "unpaid")}">${esc(PAYMENT_STATUS_LABEL[l.paymentStatus] || PAYMENT_STATUS_LABEL.unpaid)}</span>
          <span class="badge s-${esc(l.deliveryStatus || "not_sent")}">${esc(DELIVERY_STATUS_LABEL[l.deliveryStatus] || DELIVERY_STATUS_LABEL.not_sent)}</span>
        </div>
        <div>${notesHtml}</div>
        <div>${leadActionsHtml(l)}</div>
      </div>`;
    }).join("");

    document.querySelectorAll("[data-expand]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lead = crmLeadCache.find((l) => l.id === btn.dataset.expand);
        if (!lead) return;
        const textEl = document.getElementById("ntxt-" + btn.dataset.expand);
        if (textEl) textEl.textContent = lead.notes;
        btn.remove();
      });
    });
    document.querySelectorAll("[data-add-notes]").forEach((btn) => {
      btn.addEventListener("click", () => openLead(crmLeadCache.find((l) => l.id === btn.dataset.addNotes)));
    });
    bindLeadActions();
  }

  async function openLead(lead) {
    if (!lead) return;
    try { await loadCrmProductOptions(); } catch (err) { return alert(err.message); }
    openModal(`<h3>${normalizeLeadStatus(lead.status) === "won" ? "Успішна заявка · редагування та допродаж" : "Редагувати клієнта"}</h3>
      <div class="field"><label>Ім’я *</label><input id="crm_name" value="${esc(lead.name)}"></div>
      <div class="grid2"><div class="field"><label>Телефон *</label><input id="crm_phone" type="tel" value="${esc(lead.phone)}"></div><div class="field"><label>Email</label><input id="crm_email" type="email" value="${esc(lead.email || "")}"></div></div>
      <div class="field"><label>Інтерес</label><input id="crm_interest" value="${esc(lead.interest || "")}" placeholder="Що цікавить клієнта"></div>
      <div class="field"><label>Повідомлення</label><textarea id="crm_message" rows="3" placeholder="Повідомлення клієнта">${esc(lead.message || "")}</textarea></div>
      ${crmProductPickerHtml()}
      ${stockWaitingFields(lead)}
      ${callbackFields(lead)}
      <div id="crm_margin_summary" class="crm-margin-summary"></div><div class="field"><label>Сума продажу, $</label><input id="crm_total" type="number" min="0" step="1" value="${esc(lead.total ?? "")}" placeholder="Потрібна для розрахунку зарплати"></div>
      <div class="field"><label>Тип звернення</label><select id="crm_type">${Object.entries(TYPE_LABEL).map(([value, label]) => `<option value="${value}" ${value === lead.type ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="field"><label>Етап</label><select id="crm_status">${CRM_STATUSES.map((s) => `<option value="${s}" ${s === normalizeLeadStatus(lead.status) ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}</select></div>
      ${currentAdmin?.role === "admin" ? `<div class="field"><label>Відповідальний менеджер</label><select id="crm_manager"><option value="">Не призначено</option>${managerCache.filter((m) => m.active || m.id === lead.managerId).map((m) => `<option value="${esc(m.id)}" ${m.id === lead.managerId ? "selected" : ""}>${esc(m.name || m.email)}${m.active ? "" : " (вимкнений)"}</option>`).join("")}</select></div>` : `<div class="field"><label>Відповідальний менеджер</label><div>${esc(lead.manager?.name || lead.manager?.email || currentAdmin?.name || currentAdmin?.email || "—")}</div></div>`}
      ${normalizeLeadStatus(lead.status) === "won" ? `<div class="field"><label>Продаж зараховано</label><div><strong>${esc(lead.soldBy?.name || lead.soldBy?.email || "Не вказано")}</strong>${lead.wonAt ? ` · ${dt(lead.wonAt)}` : ""}</div></div>` : ""}
      <div class="grid2"><div class="field"><label>Оплата</label><select id="crm_payment_status">${statusOptions(PAYMENT_STATUS_LABEL, lead.paymentStatus || "unpaid")}</select></div><div class="field"><label>Доставка</label><select id="crm_delivery_status">${statusOptions(DELIVERY_STATUS_LABEL, lead.deliveryStatus || "not_sent")}</select></div></div>
      <div class="field"><label>Нотатки менеджера</label><textarea id="crm_notes" rows="5" placeholder="Домовленості, наступний крок, бюджет…">${esc(lead.notes || "")}</textarea></div>
      <div class="error" id="crm_error"></div>
      <div class="modal-actions">${currentAdmin?.role === "admin" ? `<button class="btn btn-danger" id="crm_delete">Видалити заявку</button>` : ""}<button class="btn btn-ghost" id="crm_cancel">Закрити</button><button class="btn" id="crm_save">Зберегти</button></div>`);
    setupCallbackFields();
    const updateFinancials = (items, recalculateTotal = true) => {
      if (recalculateTotal) $("crm_total").value = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const costs = items.map((item) => {
        if (item.purchasePrice != null) return item.purchasePrice * item.quantity;
        const batches = (crmProductOptions.find((p) => p.id === item.id)?.batches || []).filter((b) => !b.arrivalDate && b.purchasePrice != null);
        const price = item.warehouseItemId ? batches.find((b) => b.id === item.warehouseItemId)?.purchasePrice : new Set(batches.map((b) => b.purchasePrice)).size === 1 ? batches[0]?.purchasePrice : null;
        return price == null ? null : price * item.quantity;
      });
      const complete = items.length && costs.every((cost) => cost != null);
      const purchase = costs.reduce((sum, cost) => sum + (cost || 0), 0);
      const margin = Number($("crm_total").value) - purchase;
      $("crm_margin_summary").innerHTML = complete ? `<strong>Закупівля: ${money(purchase)} · Маржа: ${money(margin)}</strong><div>Комісія менеджера (10% від маржі): <strong>${money(Math.round(Math.max(0, margin) * 10) / 100)}</strong></div>` : "Для розрахунку 10% комісії вкажіть складську закупівлю кожного товару.";
    };
    const getProducts = setupCrmProductPicker(lead.items || [], updateFinancials);
    updateFinancials(getProducts(), false);
    $("crm_total").addEventListener("input", () => updateFinancials(getProducts(), false));
    $("crm_cancel").addEventListener("click", closeModal);
    if ($("crm_delete")) $("crm_delete").addEventListener("click", async () => {
      if (!confirm(`Видалити заявку клієнта «${lead.name}»? Цю дію неможливо скасувати.`)) return;
      try {
        await api("/api/leads/" + lead.id, { method: "DELETE" });
        closeModal();
        loadCrm();
      } catch (err) { $("crm_error").textContent = err.message; }
    });
    $("crm_save").addEventListener("click", async () => {
      const name = $("crm_name").value.trim();
      const phone = $("crm_phone").value.trim();
      if (!name || phone.length < 3) {
        $("crm_error").textContent = !name ? "Вкажіть ім’я" : "Вкажіть телефон";
        return;
      }
      try {
        await api("/api/leads/" + lead.id, { method: "PATCH", body: JSON.stringify({
          ...callbackPayload(lead),
          name,
          phone,
          email: $("crm_email").value.trim(),
          interest: $("crm_interest").value.trim(),
          message: $("crm_message").value.trim(),
          type: $("crm_type").value,
          status: $("crm_status").value,
          paymentStatus: $("crm_payment_status").value,
          deliveryStatus: $("crm_delivery_status").value,
          waitingForStock: $("crm_waiting_stock").checked,
          waitingProduct: $("crm_waiting_product").value.trim(),
          notes: $("crm_notes").value,
          items: getProducts(),
          total: Number($("crm_total").value) || 0,
          ...(currentAdmin?.role === "admin" && ($("crm_manager").value || null) !== (lead.managerId || null) ? { managerId: $("crm_manager").value || null } : {}),
        }) });
        closeModal();
        loadCrm();
      } catch (err) { $("crm_error").textContent = err.message; }
    });
  }

  // ── Finance ledger ────────────────────────────────────────────────────────
  function financeSaleTotals(sale) {
    const totalExpenses = sale.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const profit = Number(sale.revenue) - totalExpenses;
    const payouts = Object.fromEntries(financeCache.participants.map((person) => [person.id, 0]));
    sale.expenses.forEach((expense) => { payouts[expense.participantId] = (payouts[expense.participantId] || 0) + Number(expense.amount); });
    sale.shares.forEach((share) => { payouts[share.participantId] = (payouts[share.participantId] || 0) + profit * Number(share.percent) / 100; });
    return { totalExpenses, profit, payouts };
  }

  async function loadFinance() {
    try {
      financeCache = await api("/api/finance");
      renderFinance();
    } catch (err) {
      $("financeBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`;
    }
  }

  function renderFinance() {
    $("financeParticipants").innerHTML = financeCache.participants.map((person) => `<div class="field" style="margin:0"><label>Ім’я</label><input data-finance-person="${esc(person.id)}" value="${esc(person.name)}"></div>`).join("");
    const aggregate = Object.fromEntries(financeCache.participants.map((person) => [person.id, { spent: 0, payout: 0 }]));
    let revenue = 0;
    let expenses = 0;
    financeCache.sales.forEach((sale) => {
      const totals = financeSaleTotals(sale);
      revenue += Number(sale.revenue);
      expenses += totals.totalExpenses;
      sale.expenses.forEach((expense) => { aggregate[expense.participantId].spent += Number(expense.amount); });
      Object.entries(totals.payouts).forEach(([personId, amount]) => { aggregate[personId].payout += amount; });
    });
    $("financeStats").innerHTML = [
      ["Усього продано", money(revenue)],
      ["Усього витрат", money(expenses)],
      ["Чистий прибуток", money(revenue - expenses)],
      ...financeCache.participants.map((person) => [`Видати · ${person.name}`, money(aggregate[person.id].payout)]),
    ].map(([label, value]) => `<div class="stat"><div class="n" style="font-size:22px">${esc(value)}</div><div class="l">${esc(label)}</div></div>`).join("");

    $("financeBody").innerHTML = financeCache.sales.length ? `<table><thead><tr><th>Продаж</th><th>Виручка</th><th>Витрати</th><th>Прибуток і частки</th><th>До видачі</th><th></th></tr></thead><tbody>${financeCache.sales.map((sale) => {
      const totals = financeSaleTotals(sale);
      const personName = (id) => financeCache.participants.find((person) => person.id === id)?.name || "—";
      return `<tr>
        <td><strong>${esc(sale.item)}</strong>${sale.customer ? `<div class="muted">Клієнт: ${esc(sale.customer)}</div>` : ""}<div class="muted">${esc(uaDate(sale.soldAt))}</div></td>
        <td class="nowrap"><strong>${money(sale.revenue)}</strong></td>
        <td>${money(totals.totalExpenses)}${sale.expenses.length ? `<div class="muted" style="margin-top:5px">${sale.expenses.map((expense) => `${esc(personName(expense.participantId))}: ${esc(expense.purpose)} — ${money(expense.amount)}`).join("<br>")}</div>` : ""}</td>
        <td class="nowrap"><strong>${money(totals.profit)}</strong><div class="muted">${sale.shares.map((share) => `${esc(personName(share.participantId))} ${Number(share.percent).toLocaleString("uk-UA")}%`).join(" · ")}</div></td>
        <td class="nowrap">${financeCache.participants.map((person) => `${esc(person.name)}: <strong>${money(totals.payouts[person.id])}</strong>`).join("<br>")}</td>
        <td><div class="row-actions"><button class="btn-sm btn-ghost" data-edit-finance="${esc(sale.id)}">Редагувати</button><button class="btn-sm btn-danger" data-del-finance="${esc(sale.id)}">Видалити</button></div></td>
      </tr>`;
    }).join("")}</tbody></table>` : `<div class="empty">Додайте перший продаж</div>`;

    document.querySelectorAll("[data-edit-finance]").forEach((button) => button.addEventListener("click", () => financeSaleModal(financeCache.sales.find((sale) => sale.id === button.dataset.editFinance))));
    document.querySelectorAll("[data-del-finance]").forEach((button) => button.addEventListener("click", async () => {
      if (!confirm("Видалити цей продаж разом із витратами?")) return;
      try { await api("/api/finance/sales/" + button.dataset.delFinance, { method: "DELETE" }); loadFinance(); }
      catch (err) { alert(err.message); }
    }));
  }

  const _sfp = $("saveFinanceParticipants");
  if (_sfp) _sfp.addEventListener("click", async () => {
    const participants = financeCache.participants.map((person) => ({ id: person.id, name: document.querySelector(`[data-finance-person="${person.id}"]`).value.trim() }));
    if (participants.some((person) => !person.name)) return alert("Вкажіть усі три імені");
    try { await api("/api/finance/participants", { method: "PUT", body: JSON.stringify({ participants }) }); loadFinanceLedger(); }
    catch (err) { alert(err.message); }
  });

  function financeSaleModal(existing) {
    const isNew = !existing;
    const sale = existing || {
      item: "", customer: "", revenue: "", soldAt: todayInKyiv(), notes: "", expenses: [],
      shares: financeCache.participants.map((person, index) => ({ participantId: person.id, percent: index === 0 ? 33.34 : 33.33 })),
    };
    let expenseRows = sale.expenses.map((expense) => ({ ...expense }));
    openModal(`<h3>${isNew ? "Новий продаж" : "Редагувати продаж"}</h3>
      <div class="field"><label>Що продали *</label><input id="finance_item" value="${esc(sale.item)}" placeholder="Наприклад: інвертор Deye 6 кВт"></div>
      <div class="grid2"><div class="field"><label>Клієнт</label><input id="finance_customer" value="${esc(sale.customer)}"></div><div class="field"><label>Дата продажу</label><input id="finance_date" type="date" value="${esc(sale.soldAt)}"></div></div>
      <div class="field"><label>Сума продажу, $ *</label><input id="finance_revenue" type="number" min="0" step="0.01" value="${esc(sale.revenue)}"></div>
      <div style="font-weight:700;margin:16px 0 8px">Витрати</div><div id="finance_expenses"></div>
      <button class="btn-sm btn-ghost" type="button" id="finance_add_expense">+ Додати витрату</button>
      <div style="font-weight:700;margin:18px 0 8px">Частки чистого прибутку</div>
      <div class="grid2">${sale.shares.map((share) => `<div class="field"><label>${esc(financeCache.participants.find((person) => person.id === share.participantId)?.name)}</label><input type="number" min="0" max="100" step="0.01" data-finance-share="${esc(share.participantId)}" value="${esc(share.percent)}"></div>`).join("")}</div>
      <div class="muted" id="finance_share_total"></div>
      <div class="field"><label>Нотатки</label><textarea id="finance_notes" rows="3">${esc(sale.notes)}</textarea></div>
      <div class="error" id="finance_error"></div>
      <div class="modal-actions"><button class="btn btn-ghost" id="finance_cancel">Скасувати</button><button class="btn" id="finance_save">Зберегти</button></div>`);

    const participantOptions = (selected) => financeCache.participants.map((person) => `<option value="${esc(person.id)}" ${person.id === selected ? "selected" : ""}>${esc(person.name)}</option>`).join("");
    const renderExpenses = () => {
      $("finance_expenses").innerHTML = expenseRows.length ? expenseRows.map((expense, index) => `<div class="grid2" style="align-items:end;border-bottom:1px solid #e2e8f0;margin-bottom:10px"><div class="field"><label>Хто платив</label><select data-expense-person="${index}">${participantOptions(expense.participantId)}</select></div><div class="field"><label>За що</label><input data-expense-purpose="${index}" value="${esc(expense.purpose)}"></div><div class="field"><label>Сума, $</label><input type="number" min="0" step="0.01" data-expense-amount="${index}" value="${esc(expense.amount)}"></div><div class="field"><button type="button" class="btn-sm btn-danger" data-remove-expense="${index}">Видалити</button></div></div>`).join("") : `<div class="muted" style="margin-bottom:10px">Витрат ще немає</div>`;
      document.querySelectorAll("[data-remove-expense]").forEach((button) => button.addEventListener("click", () => { expenseRows.splice(Number(button.dataset.removeExpense), 1); renderExpenses(); }));
    };
    const updateShareTotal = () => {
      const total = [...document.querySelectorAll("[data-finance-share]")].reduce((sum, input) => sum + (Number(input.value) || 0), 0);
      $("finance_share_total").textContent = `Разом: ${total.toLocaleString("uk-UA")}% (має бути 100%)`;
    };
    renderExpenses();
    updateShareTotal();
    document.querySelectorAll("[data-finance-share]").forEach((input) => input.addEventListener("input", updateShareTotal));
    $("finance_add_expense").addEventListener("click", () => { expenseRows.push({ participantId: financeCache.participants[0].id, purpose: "", amount: "" }); renderExpenses(); });
    $("finance_cancel").addEventListener("click", closeModal);
    $("finance_save").addEventListener("click", async () => {
      const expenses = expenseRows.map((expense, index) => ({
        ...(expense.id ? { id: expense.id } : {}), participantId: document.querySelector(`[data-expense-person="${index}"]`).value,
        purpose: document.querySelector(`[data-expense-purpose="${index}"]`).value.trim(), amount: Number(document.querySelector(`[data-expense-amount="${index}"]`).value),
      }));
      const shares = [...document.querySelectorAll("[data-finance-share]")].map((input) => ({ participantId: input.dataset.financeShare, percent: Number(input.value) }));
      const body = { item: $("finance_item").value.trim(), customer: $("finance_customer").value.trim(), revenue: Number($("finance_revenue").value), soldAt: $("finance_date").value, notes: $("finance_notes").value, expenses, shares };
      if (!body.item || !body.soldAt || $("finance_revenue").value === "") return $("finance_error").textContent = "Заповніть товар, дату і суму продажу";
      if (expenses.some((expense) => !expense.purpose || expense.amount < 0)) return $("finance_error").textContent = "Заповніть призначення та суму кожної витрати";
      if (Math.abs(shares.reduce((sum, share) => sum + share.percent, 0) - 100) > 0.01) return $("finance_error").textContent = "Сума часток має дорівнювати 100%";
      try {
        await api(isNew ? "/api/finance/sales" : "/api/finance/sales/" + existing.id, { method: isNew ? "POST" : "PUT", body: JSON.stringify(body) });
        closeModal(); loadFinance();
      } catch (err) { $("finance_error").textContent = err.message; }
    });
  }

  async function loadFinanceLedger() {
    try { financeCache = await api("/api/finance"); renderFinanceLedger(); }
    catch (err) { $("financeIncomeBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
  }

  const financeUsd = (entry, amount = entry.amount) => Number(amount) / (entry.currency === "UAH" ? Number(entry.exchangeRate) : 1);
  const financeAmount = (entry, amount = entry.amount) => entry.currency === "UAH"
    ? `₴${Number(amount).toLocaleString("uk-UA")} (${money(financeUsd(entry, amount))})`
    : money(amount);
  function addFinanceCurrencyFields(prefix, item) {
    $(prefix + "_amount").closest(".field").insertAdjacentHTML("afterend", `<div class="grid2"><div class="field"><label>Валюта</label><select id="${prefix}_currency"><option value="USD" ${item.currency !== "UAH" ? "selected" : ""}>USD ($)</option><option value="UAH" ${item.currency === "UAH" ? "selected" : ""}>UAH (₴)</option></select></div><div class="field" id="${prefix}_rate_wrap"><label>Курс, гривень за $1</label><input id="${prefix}_rate" type="number" min="0.01" step="0.01" value="${esc(item.exchangeRate || "")}" placeholder="Наприклад: 41.50"></div></div>`);
    const toggle = () => { const isUah = $(prefix + "_currency").value === "UAH"; $(prefix + "_rate_wrap").style.display = isUah ? "block" : "none"; $(prefix + "_amount").previousElementSibling.textContent = `Сума, ${isUah ? "₴" : "$"} *`; };
    $(prefix + "_currency").addEventListener("change", toggle); toggle();
  }

  function renderFinanceLedger() {
    $("financeParticipants").innerHTML = financeCache.participants.map((person) => `<div class="field" style="margin:0"><label>Ім’я</label><input data-finance-person="${esc(person.id)}" value="${esc(person.name)}"></div>`).join("");
    const incomeShares = Object.fromEntries(financeCache.participants.map((person) => [person.id, 0]));
    const paid = Object.fromEntries(financeCache.participants.map((person) => [person.id, 0]));
    const actual = Object.fromEntries(financeCache.participants.map((person) => [person.id, 0]));
    const incomeTotal = financeCache.incomes.reduce((sum, income) => sum + financeUsd(income), 0);
    const collectedAmount = (income) => income.receipts?.length ? income.receipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0) : (income.paymentStatus === "received" ? Number(income.amount) : 0);
    const fundedIncomes = financeCache.incomes.filter((income) => collectedAmount(income) > 0);
    const receivedTotal = fundedIncomes.reduce((sum, income) => sum + financeUsd(income, collectedAmount(income)), 0);
    const unassignedTotal = fundedIncomes.filter((income) => !income.receipts?.length && !income.heldBy).reduce((sum, income) => sum + financeUsd(income, collectedAmount(income)), 0);
    const expenseTotal = financeCache.expenses.reduce((sum, expense) => sum + financeUsd(expense), 0);
    fundedIncomes.forEach((income) => {
      const collected = financeUsd(income, collectedAmount(income));
      income.shares.forEach((share) => { incomeShares[share.participantId] += collected * Number(share.percent) / 100; });
      if (income.receipts?.length) income.receipts.forEach((receipt) => { actual[receipt.participantId] += financeUsd(income, receipt.amount); });
      else if (income.heldBy) actual[income.heldBy] += collected;
    });
    financeCache.expenses.forEach((expense) => { const amount = financeUsd(expense); paid[expense.participantId] += amount; actual[expense.participantId] -= amount; });
    (financeCache.transfers || []).forEach((transfer) => { const amount = financeUsd(transfer); actual[transfer.fromParticipantId] -= amount; actual[transfer.toParticipantId] += amount; });
    const target = Object.fromEntries(financeCache.participants.map((person) => [person.id, incomeShares[person.id] - expenseTotal / 3]));
    const difference = Object.fromEntries(financeCache.participants.map((person) => [person.id, target[person.id] - actual[person.id]]));
    $("financeStats").innerHTML = [["Записано надходжень", money(incomeTotal)], ["Фактично отримано", money(receivedTotal)], ["Витрати", money(expenseTotal)], ["Грошей у команді", money(receivedTotal - expenseTotal)]].map(([label, value]) => `<div class="stat"><div class="n" style="font-size:22px">${esc(value)}</div><div class="l">${esc(label)}</div></div>`).join("");

    const name = (id) => financeCache.participants.find((person) => person.id === id)?.name || "—";
    const statusLabel = { expected: "Очікуємо оплату", post: "На пошті", partial: "Отримано частково", received: "Отримано" };
    const methodLabel = { cash: "готівка", card: "картка", account: "рахунок", cod: "післяплата" };
    const debtors = financeCache.participants.map((person) => ({ person, amount: -difference[person.id] })).filter((row) => row.amount > 0.005);
    const creditors = financeCache.participants.map((person) => ({ person, amount: difference[person.id] })).filter((row) => row.amount > 0.005);
    const steps = [];
    debtors.forEach((debtor) => { creditors.forEach((creditor) => { const amount = Math.min(debtor.amount, creditor.amount); if (amount > 0.005) { steps.push(`${debtor.person.name} передає ${creditor.person.name} ${money(amount)}`); debtor.amount -= amount; creditor.amount -= amount; } }); });
    $("financeSettlement").innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px">${financeCache.participants.map((person) => `<div style="padding:12px;border:1px solid #e2e8f0;border-radius:9px"><strong>${esc(person.name)}</strong><div class="muted">Фактично: ${money(actual[person.id])}</div><div class="muted">Має бути: ${money(target[person.id])}</div><div style="margin-top:5px;font-weight:700;color:${difference[person.id] >= 0 ? "#166534" : "#b91c1c"}">${difference[person.id] >= 0 ? "Отримати" : "Передати"}: ${money(Math.abs(difference[person.id]))}</div></div>`).join("")}</div>${unassignedTotal > 0 ? `<div style="padding:10px 12px;background:#fff7ed;border-radius:8px;color:#9a3412;font-weight:700">! Для отриманих ${money(unassignedTotal)} не вказано, у кого гроші. Відкрийте надходження та оберіть учасника.</div>` : steps.length ? steps.map((step) => `<div style="padding:10px 12px;margin-top:7px;background:#eff6ff;border-radius:8px;font-weight:700">→ ${esc(step)}</div>`).join("") : `<div style="padding:10px 12px;background:#ecfdf5;border-radius:8px;color:#166534;font-weight:700">✓ Передавати кошти між учасниками зараз не потрібно</div>`}`;
    $("financeIncomeBody").innerHTML = financeCache.incomes.length ? `<table><thead><tr><th>Дата</th><th>За що отримано</th><th>Сума</th><th>Стан грошей</th><th>Частки</th><th></th></tr></thead><tbody>${financeCache.incomes.map((income) => `<tr><td class="nowrap">${esc(uaDate(income.date))}</td><td><strong>${esc(income.purpose)}</strong>${income.customer ? `<div class="muted">Клієнт: ${esc(income.customer)}</div>` : ""}${income.notes ? `<div class="muted">${esc(income.notes)}</div>` : ""}</td><td><strong>${financeAmount(income)}</strong>${income.currency === "UAH" ? `<div class="muted">курс ${Number(income.exchangeRate).toLocaleString("uk-UA")} ₴/$</div>` : ""}${collectedAmount(income) < Number(income.amount) ? `<div class="muted">отримано ${financeAmount(income, collectedAmount(income))}</div>` : ""}</td><td><span class="badge ${income.paymentStatus === "received" ? "s-done" : "s-new"}">${esc(statusLabel[income.paymentStatus])}</span><div class="muted" style="margin-top:5px">${income.receipts?.length ? income.receipts.map((receipt) => `${esc(name(receipt.participantId))}: ${financeAmount(income, receipt.amount)} · ${esc(methodLabel[receipt.method])}`).join("<br>") : income.paymentStatus === "received" ? `${esc(name(income.heldBy))} · ${esc(methodLabel[income.paymentMethod])}` : esc(methodLabel[income.paymentMethod])}</div></td><td class="muted">${income.shares.map((share) => `${esc(name(share.participantId))}: ${Number(share.percent).toLocaleString("uk-UA")}%`).join("<br>")}</td><td><div class="row-actions"><button class="btn-sm btn-ghost" data-edit-income="${esc(income.id)}">Редагувати</button><button class="btn-sm btn-danger" data-del-income="${esc(income.id)}">Видалити</button></div></td></tr>`).join("")}</tbody></table>` : `<div class="empty">Надходжень ще немає</div>`;
    $("financeExpenseBody").innerHTML = financeCache.expenses.length ? `<table><thead><tr><th>Дата</th><th>На що витрачено</th><th>Хто платив</th><th>Сума</th><th></th></tr></thead><tbody>${financeCache.expenses.map((expense) => `<tr><td class="nowrap">${esc(uaDate(expense.date))}</td><td><strong>${esc(expense.purpose)}</strong>${expense.notes ? `<div class="muted">${esc(expense.notes)}</div>` : ""}</td><td>${esc(name(expense.participantId))}</td><td><strong>${financeAmount(expense)}</strong>${expense.currency === "UAH" ? `<div class="muted">курс ${Number(expense.exchangeRate).toLocaleString("uk-UA")} ₴/$</div>` : ""}</td><td><div class="row-actions"><button class="btn-sm btn-ghost" data-edit-expense="${esc(expense.id)}">Редагувати</button><button class="btn-sm btn-danger" data-del-expense="${esc(expense.id)}">Видалити</button></div></td></tr>`).join("")}</tbody></table>` : `<div class="empty">Витрат ще немає</div>`;
    $("financeTransferBody").innerHTML = (financeCache.transfers || []).length ? `<table><thead><tr><th>Дата</th><th>Хто передав</th><th>Кому</th><th>Сума</th><th>Спосіб</th><th></th></tr></thead><tbody>${financeCache.transfers.map((transfer) => `<tr><td>${esc(uaDate(transfer.date))}</td><td>${esc(name(transfer.fromParticipantId))}</td><td>${esc(name(transfer.toParticipantId))}</td><td><strong>${financeAmount(transfer)}</strong></td><td>${esc(methodLabel[transfer.method])}${transfer.notes ? `<div class="muted">${esc(transfer.notes)}</div>` : ""}</td><td><button class="btn-sm btn-danger" data-del-transfer="${esc(transfer.id)}">Видалити</button></td></tr>`).join("")}</tbody></table>` : `<div class="empty">Передач між учасниками ще не було</div>`;
    document.querySelectorAll("[data-edit-income]").forEach((button) => button.addEventListener("click", () => financeIncomeModal(financeCache.incomes.find((item) => item.id === button.dataset.editIncome))));
    document.querySelectorAll("[data-edit-expense]").forEach((button) => button.addEventListener("click", () => financeExpenseModal(financeCache.expenses.find((item) => item.id === button.dataset.editExpense))));
    document.querySelectorAll("[data-del-income]").forEach((button) => button.addEventListener("click", () => deleteFinanceEntry("incomes", button.dataset.delIncome, "надходження")));
    document.querySelectorAll("[data-del-expense]").forEach((button) => button.addEventListener("click", () => deleteFinanceEntry("expenses", button.dataset.delExpense, "витрату")));
    document.querySelectorAll("[data-del-transfer]").forEach((button) => button.addEventListener("click", () => deleteFinanceEntry("transfers", button.dataset.delTransfer, "передачу")));
  }

  async function deleteFinanceEntry(kind, id, label) {
    if (!confirm(`Видалити ${label}?`)) return;
    try { await api(`/api/finance/${kind}/${id}`, { method: "DELETE" }); loadFinanceLedger(); } catch (err) { alert(err.message); }
  }

  function financeIncomeModal(existing) {
    const item = existing || { purpose: "", customer: "", amount: "", currency: "USD", exchangeRate: 1, date: todayInKyiv(), notes: "", paymentStatus: "expected", paymentMethod: "card", heldBy: null, receipts: [], shares: financeCache.participants.map((person, index) => ({ participantId: person.id, percent: index === 0 ? 33.34 : 33.33 })) };
    let receiptRows = item.receipts?.length ? item.receipts.map((receipt) => ({ ...receipt })) : (item.paymentStatus === "received" && item.heldBy ? [{ participantId: item.heldBy, amount: item.amount, method: item.paymentMethod }] : []);
    openModal(`<h3>${existing ? "Редагувати надходження" : "Нове надходження"}</h3><div class="field"><label>За що отримано *</label><input id="fin_income_purpose" value="${esc(item.purpose)}" placeholder="Наприклад: продаж інвертора"></div><div class="grid2"><div class="field"><label>Клієнт</label><input id="fin_income_customer" value="${esc(item.customer)}"></div><div class="field"><label>Дата</label><input id="fin_income_date" type="date" value="${esc(item.date)}"></div></div><div class="field"><label>Сума, $ *</label><input id="fin_income_amount" type="number" min="0" step="0.01" value="${esc(item.amount)}"></div><div style="font-weight:700;margin:14px 0 8px">Де зараз гроші</div><div class="grid2"><div class="field"><label>Стан оплати</label><select id="fin_income_status"><option value="expected" ${item.paymentStatus === "expected" ? "selected" : ""}>Очікуємо оплату</option><option value="post" ${item.paymentStatus === "post" ? "selected" : ""}>Кошти на пошті</option><option value="received" ${item.paymentStatus === "received" ? "selected" : ""}>Отримано</option></select></div><div class="field"><label>Спосіб</label><select id="fin_income_method"><option value="card" ${item.paymentMethod === "card" ? "selected" : ""}>На картку</option><option value="cash" ${item.paymentMethod === "cash" ? "selected" : ""}>Готівка</option><option value="account" ${item.paymentMethod === "account" ? "selected" : ""}>На рахунок</option><option value="cod" ${item.paymentMethod === "cod" ? "selected" : ""}>Післяплата</option></select></div></div><div class="field" id="fin_income_holder_wrap"><label>У кого знаходяться кошти</label><select id="fin_income_holder"><option value="">— Оберіть —</option>${financeCache.participants.map((person) => `<option value="${esc(person.id)}" ${person.id === item.heldBy ? "selected" : ""}>${esc(person.name)}</option>`).join("")}</select></div><div style="font-weight:700;margin:14px 0 8px">Частки надходження</div><div class="grid2">${item.shares.map((share) => `<div class="field"><label>${esc(financeCache.participants.find((person) => person.id === share.participantId)?.name)}</label><input type="number" min="0" max="100" step="0.01" data-income-share="${esc(share.participantId)}" value="${esc(share.percent)}"></div>`).join("")}</div><div class="muted" id="fin_income_total"></div><div class="field"><label>Нотатки</label><textarea id="fin_income_notes" rows="3">${esc(item.notes)}</textarea></div><div class="error" id="fin_income_error"></div><div class="modal-actions"><button class="btn btn-ghost" id="fin_income_cancel">Скасувати</button><button class="btn" id="fin_income_save">Зберегти</button></div>`);
    addFinanceCurrencyFields("fin_income", item);
    $("fin_income_holder_wrap").insertAdjacentHTML("afterend", `<div id="fin_receipts_wrap"><div style="display:flex;align-items:center;justify-content:space-between;margin:12px 0 8px"><strong>Хто скільки отримав</strong><button type="button" class="btn-sm btn-ghost" id="fin_add_receipt">+ Додати отримувача</button></div><div id="fin_receipts"></div><div class="muted" id="fin_receipts_total"></div></div>`);
    if (![...$("fin_income_status").options].some((option) => option.value === "partial")) {
      const option = document.createElement("option"); option.value = "partial"; option.textContent = "Отримано частково"; $("fin_income_status").insertBefore(option, $("fin_income_status").querySelector('[value="received"]'));
      if (item.paymentStatus === "partial") $("fin_income_status").value = "partial";
    }
    const receiptOptions = (selected) => financeCache.participants.map((person) => `<option value="${esc(person.id)}" ${person.id === selected ? "selected" : ""}>${esc(person.name)}</option>`).join("");
    const receiptMethodOptions = (selected) => [["card", "На картку"], ["cash", "Готівка"], ["account", "На рахунок"], ["cod", "Післяплата"]].map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("");
    const renderReceipts = () => {
      $("fin_receipts").innerHTML = receiptRows.map((receipt, index) => `<div class="grid2" style="align-items:end;border-bottom:1px solid #e2e8f0;margin-bottom:8px"><div class="field"><label>Хто отримав</label><select data-receipt-person="${index}">${receiptOptions(receipt.participantId)}</select></div><div class="field"><label>Сума, $</label><input type="number" min="0.01" step="0.01" data-receipt-amount="${index}" value="${esc(receipt.amount)}"></div><div class="field"><label>Як отримав</label><select data-receipt-method="${index}">${receiptMethodOptions(receipt.method)}</select></div><div class="field"><button type="button" class="btn-sm btn-danger" data-remove-receipt="${index}">Видалити</button></div></div>`).join("");
      document.querySelectorAll("[data-remove-receipt]").forEach((button) => button.addEventListener("click", () => { receiptRows.splice(Number(button.dataset.removeReceipt), 1); renderReceipts(); }));
      document.querySelectorAll("[data-receipt-amount]").forEach((input) => input.addEventListener("input", updateReceiptTotal));
      updateReceiptTotal();
    };
    function updateReceiptTotal() { const total = [...document.querySelectorAll("[data-receipt-amount]")].reduce((sum, input) => sum + (Number(input.value) || 0), 0); const current = { currency: $("fin_income_currency").value, exchangeRate: Number($("fin_income_rate").value) || 1 }; const amount = Number($("fin_income_amount").value) || 0; $("fin_receipts_total").textContent = `Розподілено: ${financeAmount(current, total)} із ${financeAmount(current, amount)}. Залишок: ${financeAmount(current, amount - total)}`; }
    $("fin_add_receipt").addEventListener("click", () => { receiptRows.push({ participantId: financeCache.participants[0].id, amount: "", method: "card" }); renderReceipts(); });
    $("fin_income_amount").addEventListener("input", updateReceiptTotal);
    $("fin_income_currency").addEventListener("change", updateReceiptTotal);
    $("fin_income_rate").addEventListener("input", updateReceiptTotal);
    const updateTotal = () => { const total = [...document.querySelectorAll("[data-income-share]")].reduce((sum, input) => sum + (Number(input.value) || 0), 0); $("fin_income_total").textContent = `Разом: ${total.toLocaleString("uk-UA")}% (має бути 100%)`; };
    document.querySelectorAll("[data-income-share]").forEach((input) => input.addEventListener("input", updateTotal)); updateTotal();
    const updateHolder = () => { $("fin_income_holder_wrap").style.display = "none"; $("fin_receipts_wrap").style.display = ["partial", "received"].includes($("fin_income_status").value) ? "block" : "none"; };
    $("fin_income_status").addEventListener("change", updateHolder); updateHolder();
    renderReceipts();
    $("fin_income_cancel").addEventListener("click", closeModal);
    $("fin_income_save").addEventListener("click", async () => {
      const shares = [...document.querySelectorAll("[data-income-share]")].map((input) => ({ participantId: input.dataset.incomeShare, percent: Number(input.value) }));
      const receiptEnabled = ["partial", "received"].includes($("fin_income_status").value);
      const receipts = receiptEnabled ? receiptRows.map((_receipt, index) => ({ participantId: document.querySelector(`[data-receipt-person="${index}"]`).value, amount: Number(document.querySelector(`[data-receipt-amount="${index}"]`).value), method: document.querySelector(`[data-receipt-method="${index}"]`).value })) : [];
      const body = { purpose: $("fin_income_purpose").value.trim(), customer: $("fin_income_customer").value.trim(), amount: Number($("fin_income_amount").value), currency: $("fin_income_currency").value, exchangeRate: $("fin_income_currency").value === "UAH" ? Number($("fin_income_rate").value) : 1, date: $("fin_income_date").value, notes: $("fin_income_notes").value, paymentStatus: $("fin_income_status").value, paymentMethod: $("fin_income_method").value, heldBy: null, receipts, shares };
      if (!body.purpose || !body.date || $("fin_income_amount").value === "") return $("fin_income_error").textContent = "Заповніть призначення, дату і суму";
      if (body.currency === "UAH" && !body.exchangeRate) return $("fin_income_error").textContent = "Вкажіть курс гривні до долара";
      const receiptTotal = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
      if (receiptEnabled && (!receipts.length || receipts.some((receipt) => receipt.amount <= 0))) return $("fin_income_error").textContent = "Додайте отримувача та суму";
      if (receiptTotal > body.amount + 0.01) return $("fin_income_error").textContent = "Отримана сума не може перевищувати загальну";
      if (body.paymentStatus === "received" && Math.abs(receiptTotal - body.amount) > 0.01) return $("fin_income_error").textContent = "Для стану «Отримано» треба розподілити всю суму";
      if (body.paymentStatus === "partial" && (receiptTotal <= 0 || receiptTotal >= body.amount)) return $("fin_income_error").textContent = "Для часткової оплати залишок має бути більшим за нуль";
      if (Math.abs(shares.reduce((sum, share) => sum + share.percent, 0) - 100) > 0.01) return $("fin_income_error").textContent = "Сума часток має дорівнювати 100%";
      try { await api(existing ? `/api/finance/incomes/${existing.id}` : "/api/finance/incomes", { method: existing ? "PUT" : "POST", body: JSON.stringify(body) }); closeModal(); loadFinanceLedger(); } catch (err) { $("fin_income_error").textContent = err.message; }
    });
  }

  function financeExpenseModal(existing) {
    const item = existing || { participantId: financeCache.participants[0].id, purpose: "", amount: "", currency: "USD", exchangeRate: 1, date: todayInKyiv(), notes: "" };
    openModal(`<h3>${existing ? "Редагувати витрату" : "Нова витрата"}</h3><div class="field"><label>На що витрачено *</label><input id="fin_expense_purpose" value="${esc(item.purpose)}" placeholder="Наприклад: оплата сайту або реклама"></div><div class="grid2"><div class="field"><label>Хто заплатив</label><select id="fin_expense_person">${financeCache.participants.map((person) => `<option value="${esc(person.id)}" ${person.id === item.participantId ? "selected" : ""}>${esc(person.name)}</option>`).join("")}</select></div><div class="field"><label>Дата</label><input id="fin_expense_date" type="date" value="${esc(item.date)}"></div></div><div class="field"><label>Сума, $ *</label><input id="fin_expense_amount" type="number" min="0" step="0.01" value="${esc(item.amount)}"></div><div class="field"><label>Нотатки</label><textarea id="fin_expense_notes" rows="3">${esc(item.notes)}</textarea></div><div class="error" id="fin_expense_error"></div><div class="modal-actions"><button class="btn btn-ghost" id="fin_expense_cancel">Скасувати</button><button class="btn" id="fin_expense_save">Зберегти</button></div>`);
    addFinanceCurrencyFields("fin_expense", item);
    $("fin_expense_cancel").addEventListener("click", closeModal);
    $("fin_expense_save").addEventListener("click", async () => {
      const body = { participantId: $("fin_expense_person").value, purpose: $("fin_expense_purpose").value.trim(), amount: Number($("fin_expense_amount").value), currency: $("fin_expense_currency").value, exchangeRate: $("fin_expense_currency").value === "UAH" ? Number($("fin_expense_rate").value) : 1, date: $("fin_expense_date").value, notes: $("fin_expense_notes").value };
      if (!body.purpose || !body.date || $("fin_expense_amount").value === "") return $("fin_expense_error").textContent = "Заповніть призначення, дату і суму";
      if (body.currency === "UAH" && !body.exchangeRate) return $("fin_expense_error").textContent = "Вкажіть курс гривні до долара";
      try { await api(existing ? `/api/finance/expenses/${existing.id}` : "/api/finance/expenses", { method: existing ? "PUT" : "POST", body: JSON.stringify(body) }); closeModal(); loadFinanceLedger(); } catch (err) { $("fin_expense_error").textContent = err.message; }
    });
  }

  function financeTransferModal() {
    const options = (selected) => financeCache.participants.map((person) => `<option value="${esc(person.id)}" ${person.id === selected ? "selected" : ""}>${esc(person.name)}</option>`).join("");
    openModal(`<h3>Передача коштів</h3><p class="muted" style="margin-bottom:14px">Запишіть передачу готівки або переказ між учасниками.</p><div class="grid2"><div class="field"><label>Хто передав</label><select id="fin_transfer_from">${options(financeCache.participants[0].id)}</select></div><div class="field"><label>Кому передав</label><select id="fin_transfer_to">${options(financeCache.participants[1].id)}</select></div></div><div class="grid2"><div class="field"><label>Сума, $ *</label><input id="fin_transfer_amount" type="number" min="0.01" step="0.01"></div><div class="field"><label>Дата</label><input id="fin_transfer_date" type="date" value="${todayInKyiv()}"></div></div><div class="field"><label>Спосіб</label><select id="fin_transfer_method"><option value="card">Переказ на картку</option><option value="cash">Готівка</option><option value="account">Банківський рахунок</option></select></div><div class="field"><label>Коментар</label><textarea id="fin_transfer_notes" rows="3" placeholder="Необов’язково"></textarea></div><div class="error" id="fin_transfer_error"></div><div class="modal-actions"><button class="btn btn-ghost" id="fin_transfer_cancel">Скасувати</button><button class="btn" id="fin_transfer_save">Записати передачу</button></div>`);
    addFinanceCurrencyFields("fin_transfer", { currency: "USD", exchangeRate: 1 });
    $("fin_transfer_cancel").addEventListener("click", closeModal);
    $("fin_transfer_save").addEventListener("click", async () => {
      const body = { fromParticipantId: $("fin_transfer_from").value, toParticipantId: $("fin_transfer_to").value, amount: Number($("fin_transfer_amount").value), currency: $("fin_transfer_currency").value, exchangeRate: $("fin_transfer_currency").value === "UAH" ? Number($("fin_transfer_rate").value) : 1, date: $("fin_transfer_date").value, method: $("fin_transfer_method").value, notes: $("fin_transfer_notes").value };
      if (!body.amount || !body.date) return $("fin_transfer_error").textContent = "Вкажіть суму і дату";
      if (body.currency === "UAH" && !body.exchangeRate) return $("fin_transfer_error").textContent = "Вкажіть курс гривні до долара";
      if (body.fromParticipantId === body.toParticipantId) return $("fin_transfer_error").textContent = "Оберіть різних учасників";
      try { await api("/api/finance/transfers", { method: "POST", body: JSON.stringify(body) }); closeModal(); loadFinanceLedger(); } catch (err) { $("fin_transfer_error").textContent = err.message; }
    });
  }

  if ($("addFinanceIncome")) $("addFinanceIncome").addEventListener("click", () => financeIncomeModal(null));
  if ($("addFinanceExpense")) $("addFinanceExpense").addEventListener("click", () => financeExpenseModal(null));
  if ($("addFinanceTransfer")) $("addFinanceTransfer").addEventListener("click", financeTransferModal);

  // ── Installers ────────────────────────────────────────────────────────────
  $("addInstaller").addEventListener("click", () => installerModal(null));

  async function loadInstallers() {
    try {
      installerCache = await api("/api/crm/installers");
      $("installersBody").innerHTML = installerCache.length
        ? `<table><thead><tr><th>Ім’я</th><th>Телефон</th><th>Місто</th><th>Нотатки</th><th></th></tr></thead><tbody>${installerCache.map((installer) => `<tr>
            <td><strong>${esc(installer.name)}</strong></td>
            <td><a href="tel:${esc(installer.phone)}">${esc(installer.phone)}</a></td>
            <td>${esc(installer.city)}</td>
            <td class="supplier-meta" style="white-space:pre-wrap;max-width:420px">${esc(installer.notes || "—")}</td>
            <td class="nowrap"><div class="row-actions"><button class="btn-sm btn-ghost" data-edit-installer="${esc(installer.id)}">Редагувати</button><button class="btn-sm btn-danger" data-del-installer="${esc(installer.id)}">Видалити</button></div></td>
          </tr>`).join("")}</tbody></table>`
        : `<div class="empty">Додайте першого інсталятора</div>`;
      document.querySelectorAll("[data-edit-installer]").forEach((button) => button.addEventListener("click", () => installerModal(installerCache.find((installer) => installer.id === button.dataset.editInstaller))));
      document.querySelectorAll("[data-del-installer]").forEach((button) => button.addEventListener("click", async () => {
        if (!confirm("Видалити інсталятора?")) return;
        try {
          await api("/api/crm/installers/" + button.dataset.delInstaller, { method: "DELETE" });
          loadInstallers();
        } catch (err) { alert(err.message); }
      }));
    } catch (err) { $("installersBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
  }

  function installerModal(installer) {
    const isNew = !installer;
    const item = installer || { name: "", phone: "", city: "", notes: "" };
    openModal(`<h3>${isNew ? "Новий інсталятор" : "Редагувати інсталятора"}</h3>
      <div class="field"><label>Ім’я *</label><input id="installer_name" value="${esc(item.name)}" autocomplete="name"></div>
      <div class="grid2"><div class="field"><label>Телефон *</label><input id="installer_phone" type="tel" value="${esc(item.phone)}" autocomplete="tel" placeholder="+380..."></div><div class="field"><label>Місто *</label><input id="installer_city" value="${esc(item.city)}" autocomplete="address-level2"></div></div>
      <div class="field"><label>Нотатки</label><textarea id="installer_notes" rows="5" placeholder="Досвід, напрямки робіт, домовленості…">${esc(item.notes || "")}</textarea></div>
      <div class="error" id="installer_error"></div>
      <div class="modal-actions"><button class="btn btn-ghost" id="installer_cancel">Скасувати</button><button class="btn" id="installer_save">Зберегти</button></div>`);
    $("installer_cancel").addEventListener("click", closeModal);
    $("installer_save").addEventListener("click", async () => {
      const body = {
        name: $("installer_name").value.trim(),
        phone: $("installer_phone").value.trim(),
        city: $("installer_city").value.trim(),
        notes: $("installer_notes").value,
      };
      if (!body.name || !body.phone || !body.city) {
        $("installer_error").textContent = "Заповніть ім’я, телефон і місто";
        return;
      }
      try {
        await api(isNew ? "/api/crm/installers" : "/api/crm/installers/" + item.id, {
          method: isNew ? "POST" : "PUT",
          body: JSON.stringify(body),
        });
        closeModal();
        loadInstallers();
      } catch (err) { $("installer_error").textContent = err.message; }
    });
  }

  // ── Suppliers ─────────────────────────────────────────────────────────────
  $("addSupplier").addEventListener("click", () => supplierModal(null));

  async function loadSuppliers() {
    try {
      supplierCache = await api("/api/crm/suppliers");
      $("suppliersBody").innerHTML = supplierCache.length
        ? `<table><thead><tr><th>Назва / тип</th><th>Бренди / категорії</th><th>Контакт</th><th>Локації</th><th>Ресурси</th><th>Цін</th><th>Статус</th><th></th></tr></thead><tbody>${
            supplierCache.map((s) => `<tr class="${s.active ? "" : "supplier-inactive"}">
              <td><strong>${esc(s.name)}</strong>${s.rating ? `<br><span class="badge s-new">Рейтинг ${esc(s.rating)}</span>` : ""}<div class="supplier-meta">${esc((s.supplierTypes || []).join(" · ") || "—")}</div></td>
              <td class="supplier-meta">${esc((s.brands || []).join(", ") || "—")}<br>${esc((s.equipmentCategories || []).join(" · ") || "")}</td>
              <td class="supplier-meta">${esc(s.contactName || "—")}${s.phone ? `<br>${esc(s.phone)}` : ""}${s.email ? `<br>${esc(s.email)}` : ""}</td>
              <td class="supplier-meta">${esc((s.locations || []).join(", ") || "—")}${(s.countries || []).length ? `<br>${esc(s.countries.join(", "))}` : ""}${(s.currencies || []).length ? `<br>${esc(s.currencies.join(" / "))}` : ""}</td>
              <td class="supplier-meta">${s.website ? `<a href="${esc(s.website)}" target="_blank" rel="noopener">Сайт</a>` : ""}${s.website && s.resourceUrl ? " · " : ""}${s.resourceUrl && /^https?:\/\//.test(s.resourceUrl) ? `<a href="${esc(s.resourceUrl)}" target="_blank" rel="noopener">Прайс/ресурс</a>` : esc(s.resourceUrl || (!s.website ? "—" : ""))}${s.lastContactAt ? `<br>Контакт: ${esc(s.lastContactAt)}` : ""}</td>
              <td>${s._count ? s._count.prices : 0}</td>
              <td><span class="badge ${s.active ? "s-done" : "s-new"}">${s.active ? "Активний" : "Вимкнений"}</span></td>
              <td class="nowrap"><div class="row-actions"><button class="btn-sm btn-ghost" data-edit-supplier="${esc(s.id)}">Редагувати</button><button class="btn-sm btn-danger" data-del-supplier="${esc(s.id)}">Видалити</button></div></td>
            </tr>
            <tr class="supplier-notes-row ${s.active ? "" : "supplier-inactive"}">
              <td colspan="8"><div class="supplier-notes"><strong>Нотатки:</strong><span>${esc(s.notes || "Нотаток поки немає")}</span></div></td>
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
    const s = supplier || { name: "", contactName: "", phone: "", email: "", website: "", resourceUrl: "", supplierTypes: [], rating: "", brands: [], currencies: [], countries: [], locations: [], equipmentCategories: [], lastContactAt: "", notes: "", active: false };
    openModal(`<h3>${isNew ? "Новий постачальник" : "Редагувати постачальника"}</h3>
      <div class="field"><label>Назва *</label><input id="sup_name" value="${esc(s.name)}"></div>
      <div class="grid2"><div class="field"><label>Типи (через кому)</label><input id="sup_types" value="${esc((s.supplierTypes || []).join(", "))}"></div><div class="field"><label>Рейтинг</label><input id="sup_rating" value="${esc(s.rating || "")}" placeholder="A / B / C"></div></div>
      <div class="field"><label>Бренди (через кому)</label><input id="sup_brands" value="${esc((s.brands || []).join(", "))}"></div>
      <div class="grid2"><div class="field"><label>Контактна особа</label><input id="sup_contact" value="${esc(s.contactName || "")}"></div><div class="field"><label>Телефон</label><input id="sup_phone" value="${esc(s.phone || "")}"></div></div>
      <div class="grid2"><div class="field"><label>Email</label><input id="sup_email" type="email" value="${esc(s.email || "")}"></div><div class="field"><label>Сайт</label><input id="sup_website" value="${esc(s.website || "")}"></div></div>
      <div class="field"><label>Посилання на прайс / документи</label><input id="sup_resource" value="${esc(s.resourceUrl || "")}"></div>
      <div class="grid2"><div class="field"><label>Локації (через кому)</label><input id="sup_locations" value="${esc((s.locations || []).join(", "))}"></div><div class="field"><label>Країни (через кому)</label><input id="sup_countries" value="${esc((s.countries || []).join(", "))}"></div></div>
      <div class="grid2"><div class="field"><label>Валюти (через кому)</label><input id="sup_currencies" value="${esc((s.currencies || []).join(", "))}"></div><div class="field"><label>Останній контакт</label><input id="sup_last_contact" type="date" value="${esc(s.lastContactAt || "")}"></div></div>
      <div class="field"><label>Категорії обладнання (через кому)</label><input id="sup_equipment" value="${esc((s.equipmentCategories || []).join(", "))}"></div>
      <div class="field"><label>Умови та нотатки</label><textarea id="sup_notes" rows="4">${esc(s.notes || "")}</textarea></div>
      <div class="field"><label style="display:flex;gap:8px;align-items:center;text-transform:none"><input id="sup_active" type="checkbox" ${s.active ? "checked" : ""} style="width:auto"> Активний постачальник</label></div>
      <div class="error" id="sup_error"></div><div class="modal-actions"><button class="btn btn-ghost" id="sup_cancel">Скасувати</button><button class="btn" id="sup_save">Зберегти</button></div>`);
    $("sup_cancel").addEventListener("click", closeModal);
    $("sup_save").addEventListener("click", async () => {
      const csv = (id) => $(id).value.split(",").map((v) => v.trim()).filter(Boolean);
      const body = { name: $("sup_name").value.trim(), contactName: $("sup_contact").value.trim(), phone: $("sup_phone").value.trim(), email: $("sup_email").value.trim(), website: $("sup_website").value.trim(), resourceUrl: $("sup_resource").value.trim(), supplierTypes: csv("sup_types"), rating: $("sup_rating").value.trim(), brands: csv("sup_brands"), currencies: csv("sup_currencies"), countries: csv("sup_countries"), locations: csv("sup_locations"), equipmentCategories: csv("sup_equipment"), lastContactAt: $("sup_last_contact").value || null, notes: $("sup_notes").value, active: $("sup_active").checked };
      try {
        await api(isNew ? "/api/crm/suppliers" : "/api/crm/suppliers/" + s.id, { method: isNew ? "POST" : "PUT", body: JSON.stringify(body) });
        closeModal(); loadSuppliers();
      } catch (err) { $("sup_error").textContent = err.message; }
    });
  }

  // ── Supplier price matrix ─────────────────────────────────────────────────
  $("refreshPricing").addEventListener("click", loadPricing);
  $("syncRetailPrices").addEventListener("click", async () => {
    if (!confirm("Оновити роздрібні ціни всіх активних товарів: мінімальна актуальна закупівельна ціна + 20%?")) return;
    const button = $("syncRetailPrices");
    button.disabled = true;
    button.textContent = "Оновлення…";
    try {
      const result = await api("/api/crm/sync-retail-prices", { method: "POST" });
      alert(`Готово. Оновлено товарів: ${result.updatedProducts}. Без актуальної ціни: ${result.skippedProducts}.`);
      loadPricing();
    } catch (err) { alert(err.message); }
    finally { button.disabled = false; button.textContent = "+20% → ціни товарів"; }
  });
  $("pricingSearch").addEventListener("input", () => pricingCache && renderPricing(pricingCache));
  $("pricingCategoryFilter").addEventListener("change", () => pricingCache && renderPricing(pricingCache));
  $("pricingBrandFilter").addEventListener("change", () => pricingCache && renderPricing(pricingCache));

  async function loadPricing() {
    try {
      const data = await api("/api/crm/price-matrix");
      pricingCache = data;
      const selectedCategory = $("pricingCategoryFilter").value;
      const selectedBrand = $("pricingBrandFilter").value;
      $("pricingCategoryFilter").innerHTML = `<option value="all">Усі категорії</option>${(data.categories || []).map((c) => `<option value="${esc(c.key)}">${esc(c.label)}</option>`).join("")}`;
      const brands = [...new Set(data.products.map((p) => p.brandLabel).filter(Boolean))].sort((a, b) => a.localeCompare(b, "uk"));
      $("pricingBrandFilter").innerHTML = `<option value="all">Усі бренди</option>${brands.map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join("")}`;
      if ([...$("pricingCategoryFilter").options].some((o) => o.value === selectedCategory)) $("pricingCategoryFilter").value = selectedCategory;
      if ([...$("pricingBrandFilter").options].some((o) => o.value === selectedBrand)) $("pricingBrandFilter").value = selectedBrand;
      renderPricing(data);
    } catch (err) { $("pricingBody").innerHTML = `<div class="card empty">${esc(err.message)}</div>`; }
  }

  function renderPricing(data) {
      const previousMatrix = $("pricingBody").querySelector(".matrix-wrap");
      const scrollPosition = previousMatrix ? { top: previousMatrix.scrollTop, left: previousMatrix.scrollLeft } : null;
      const covered = new Set(data.prices.map((p) => p.productId)).size;
      $("pricingSummary").innerHTML = [["Товарів", data.products.length], ["Постачальників", data.suppliers.length], ["З цінами", covered]].map(([l, n]) => `<div class="stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join("");
      if (!data.suppliers.length) {
        $("pricingBody").innerHTML = `<div class="card empty">Активуйте хоча б одного постачальника, щоб заповнювати матрицю</div>`;
        $("pricingFilterCount").textContent = "";
        return;
      }
      const query = $("pricingSearch").value.trim().toLowerCase();
      const category = $("pricingCategoryFilter").value;
      const brand = $("pricingBrandFilter").value;
      const products = data.products.filter((p) =>
        (!query || `${p.name} ${p.id}`.toLowerCase().includes(query)) &&
        (category === "all" || (p.categoryKeys || [p.category]).includes(category)) &&
        (brand === "all" || p.brandLabel === brand)
      );
      $("pricingFilterCount").textContent = `Показано ${products.length} із ${data.products.length}`;
      const priceMap = new Map(data.prices.map((p) => [`${p.productId}:${p.supplierId}`, p]));
      const head = data.suppliers.map((s) => `<th>${esc(s.name)}</th>`).join("");
      const rows = products.map((product) => {
        const cells = data.suppliers.map((supplier) => {
          const row = priceMap.get(`${product.id}:${supplier.id}`);
          const isUnavailable = row && (row.availability === "unavailable" || row.price === 0);
          const arrivalIso = row?.arrivalDate?.slice(0, 10) || "";
          const todayIso = todayInKyiv();
          const isExpected = row?.availability === "preorder" || (arrivalIso && arrivalIso > todayIso);
          const isAvailable = row && !isUnavailable && !isExpected && row.availability === "in_stock";
          const isBest = row && !isUnavailable && !isExpected && data.bestByProduct[product.id] === row.price;
          const margin = row && !isUnavailable && product.retailPrice > 0 ? Math.round(((product.retailPrice - row.price) / product.retailPrice) * 100) : null;
          return `<td class="price-cell ${isAvailable ? "available" : ""} ${isExpected ? "expected" : ""} ${isBest ? "best" : ""} ${isUnavailable ? "unavailable" : ""}"><input type="number" min="0" placeholder="—" value="${row ? row.price : ""}" data-price-product="${esc(product.id)}" data-price-supplier="${esc(supplier.id)}">
            <label class="arrival-label">Наявність</label><select class="availability-select" data-availability-product="${esc(product.id)}" data-availability-supplier="${esc(supplier.id)}"><option value="in_stock" ${!row || row.availability === "in_stock" ? "selected" : ""}>В наявності</option><option value="preorder" ${row?.availability === "preorder" ? "selected" : ""}>Очікується</option><option value="unavailable" ${row?.availability === "unavailable" ? "selected" : ""}>Немає в наявності</option></select>
            <label class="arrival-label">Дата прибуття (необов'язково)</label><div class="arrival-control"><input class="arrival-date" type="text" inputmode="numeric" maxlength="10" placeholder="дд.мм.рррр" value="${esc(uaDate(row?.arrivalDate))}" data-arrival-product="${esc(product.id)}" data-arrival-supplier="${esc(supplier.id)}"><button class="arrival-picker" type="button" title="Вибрати дату" aria-label="Вибрати дату">📅</button><input class="arrival-native" type="date" value="${esc(arrivalIso)}"></div>
            <div class="price-cell-meta">${isUnavailable ? `<span class="unavail-label">Немає в наявності</span>` : ""}${isExpected ? `<span class="expected-label">${arrivalIso ? `Очікується ${esc(uaDate(row.arrivalDate))}` : "Очікується"}</span>` : ""}${isBest ? `<span class="best-label">✓ Найкраща актуальна ціна</span>` : ""}${margin != null ? `<span class="margin-label">Маржа ${margin}%</span>` : ""}</div></td>`;
        }).join("");
        return `<tr><td><strong>${esc(product.name)}</strong><div class="muted" style="font-size:11px">${esc(product.categoryLabel || "Без категорії")} · ${esc(product.brandLabel || "Без бренду")} · роздріб ${product.retailPrice > 0 ? money(product.retailPrice) : "—"}</div></td>${cells}</tr>`;
      }).join("");
      $("pricingBody").innerHTML = products.length ? `<div class="matrix-wrap"><table class="price-matrix"><thead><tr><th>Товар</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="card empty">За вибраними фільтрами товарів не знайдено</div>`;
      const nextMatrix = $("pricingBody").querySelector(".matrix-wrap");
      if (nextMatrix && scrollPosition) {
        nextMatrix.scrollTop = scrollPosition.top;
        nextMatrix.scrollLeft = scrollPosition.left;
      }
      document.querySelectorAll("[data-price-product]").forEach((input) => input.addEventListener("change", async () => {
        input.disabled = true;
        try {
          if (input.value === "") {
            await api("/api/crm/prices", { method: "DELETE", body: JSON.stringify({ productId: input.dataset.priceProduct, supplierId: input.dataset.priceSupplier }) });
          } else {
            const price = Number(input.value);
            const availabilityInput = [...document.querySelectorAll("[data-availability-product]")].find((candidate) => candidate.dataset.availabilityProduct === input.dataset.priceProduct && candidate.dataset.availabilitySupplier === input.dataset.priceSupplier);
            const availability = price === 0 ? "unavailable" : availabilityInput?.value || "in_stock";
            const arrivalInput = [...document.querySelectorAll("[data-arrival-product]")].find((candidate) => candidate.dataset.arrivalProduct === input.dataset.priceProduct && candidate.dataset.arrivalSupplier === input.dataset.priceSupplier);
            const arrivalDate = isoDate(arrivalInput?.value || "");
            if (arrivalDate === null) throw new Error("Введіть дату у форматі дд.мм.рррр");
            await api("/api/crm/prices", { method: "PUT", body: JSON.stringify({ productId: input.dataset.priceProduct, supplierId: input.dataset.priceSupplier, price, currency: "USD", availability, arrivalDate: arrivalDate || null, minOrderQty: 1 }) });
          }
          loadPricing();
        } catch (err) { input.disabled = false; alert(err.message); }
      }));
      document.querySelectorAll("[data-availability-product]").forEach((input) => input.addEventListener("change", async () => {
        const row = priceMap.get(`${input.dataset.availabilityProduct}:${input.dataset.availabilitySupplier}`);
        if (!row) {
          input.value = "in_stock";
          return alert("Спочатку вкажіть закупівельну ціну");
        }
        input.disabled = true;
        try {
          await api("/api/crm/prices", { method: "PUT", body: JSON.stringify({ productId: input.dataset.availabilityProduct, supplierId: input.dataset.availabilitySupplier, price: row.price, currency: row.currency || "USD", availability: input.value, leadTimeDays: row.leadTimeDays, arrivalDate: row.arrivalDate?.slice(0, 10) || null, minOrderQty: row.minOrderQty || 1 }) });
          loadPricing();
        } catch (err) { input.disabled = false; alert(err.message); }
      }));
      document.querySelectorAll("[data-arrival-product]").forEach((input) => input.addEventListener("change", async () => {
        const row = priceMap.get(`${input.dataset.arrivalProduct}:${input.dataset.arrivalSupplier}`);
        if (!row) {
          input.value = "";
          return alert("Спочатку вкажіть закупівельну ціну");
        }
        input.disabled = true;
        try {
          const arrivalDate = isoDate(input.value);
          if (arrivalDate === null) throw new Error("Введіть дату у форматі дд.мм.рррр");
          await api("/api/crm/prices", { method: "PUT", body: JSON.stringify({ productId: input.dataset.arrivalProduct, supplierId: input.dataset.arrivalSupplier, price: row.price, currency: row.currency || "USD", availability: row.availability || "in_stock", leadTimeDays: row.leadTimeDays, arrivalDate: arrivalDate || null, minOrderQty: row.minOrderQty || 1 }) });
          loadPricing();
        } catch (err) { input.disabled = false; alert(err.message); }
      }));
      document.querySelectorAll(".arrival-picker").forEach((button) => button.addEventListener("click", () => {
        const picker = button.parentElement.querySelector(".arrival-native");
        if (typeof picker.showPicker === "function") picker.showPicker();
        else picker.click();
      }));
      document.querySelectorAll(".arrival-native").forEach((picker) => picker.addEventListener("change", () => {
        const input = picker.parentElement.querySelector("[data-arrival-product]");
        input.value = uaDate(picker.value);
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }));
  }

  // ── leads ─────────────────────────────────────────────────────────────────
  if ($("refreshLeads")) $("refreshLeads").addEventListener("click", loadLeads);
  if ($("filterType")) $("filterType").addEventListener("change", loadLeads);
  if ($("filterStatus")) $("filterStatus").addEventListener("change", loadLeads);

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
            l.items.map((it) => `<div>• ${esc(it.name)} × ${it.quantity} — ${money(it.price * it.quantity)}${it.serialNumber ? `<div style="white-space:pre-line">С/Н: ${esc(it.serialNumber)}</div>` : ""}${it.purchaseLocation ? `<div>Закуплено: ${esc(it.purchaseLocation)}</div>` : ""}</div>`).join("") +
            `<div><strong>Разом: ${money(l.total)}</strong></div></div>`;
        }
        const normalizedStatus = l.status === "in_progress" ? "contacted" : l.status === "done" ? "won" : l.status;
        const statusOpts = CRM_STATUSES
          .map((s) => `<option value="${s}" ${s === normalizedStatus ? "selected" : ""}>${STATUS_LABEL[s]}</option>`)
          .join("");
        const paymentStatus = l.paymentStatus || "unpaid";
        const deliveryStatus = l.deliveryStatus || "not_sent";
        return `<tr>
          <td class="nowrap"><span class="badge b-${l.type}">${TYPE_LABEL[l.type] || l.type}</span></td>
          <td><strong>${esc(l.name)}</strong><br><a href="tel:${esc(l.phone)}">${esc(l.phone)}</a>${
          l.email ? `<br><span class="muted">${esc(l.email)}</span>` : ""
        }${details}</td>
          <td class="nowrap"><span class="badge s-${l.status}">${STATUS_LABEL[l.status]}</span><div style="display:grid;gap:5px;margin-top:7px"><span class="badge s-${paymentStatus}">${PAYMENT_STATUS_LABEL[paymentStatus]}</span><span class="badge s-${deliveryStatus}">${DELIVERY_STATUS_LABEL[deliveryStatus]}</span></div></td>
          <td class="nowrap muted">${dt(l.createdAt)}</td>
          <td class="nowrap"><div class="row-actions">
            <select data-status="${l.id}">${statusOpts}</select>
            <select data-payment-status="${l.id}" aria-label="Статус оплати">${statusOptions(PAYMENT_STATUS_LABEL, paymentStatus)}</select>
            <select data-delivery-status="${l.id}" aria-label="Статус доставки">${statusOptions(DELIVERY_STATUS_LABEL, deliveryStatus)}</select>
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
    document.querySelectorAll("[data-payment-status]").forEach((sel) =>
      sel.addEventListener("change", async () => {
        try {
          await api("/api/leads/" + sel.dataset.paymentStatus, { method: "PATCH", body: JSON.stringify({ paymentStatus: sel.value }) });
          loadLeads();
        } catch (err) { alert(err.message); }
      })
    );
    document.querySelectorAll("[data-delivery-status]").forEach((sel) =>
      sel.addEventListener("change", async () => {
        try {
          await api("/api/leads/" + sel.dataset.deliveryStatus, { method: "PATCH", body: JSON.stringify({ deliveryStatus: sel.value }) });
          loadLeads();
        } catch (err) { alert(err.message); }
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
      const selectedCategory = $("productCategoryFilter").value || "all";
      const selectedBrand = $("productBrandFilter").value || "all";
      const [products, cats, brands] = await Promise.all([api("/api/products/admin/all"), api("/api/categories?all=1"), api("/api/brands?all=1")]);
      productCache = products;
      categoryCache = cats;
      brandCache = brands;
      $("productCategoryFilter").innerHTML = `<option value="all">Усі категорії</option>${cats.map((c) => `<option value="${esc(c.key)}">${c.parentKey ? "↳ " : ""}${esc(c.label)}</option>`).join("")}`;
      $("productBrandFilter").innerHTML = `<option value="all">Усі бренди</option>${brands.map((b) => `<option value="${esc(b.slug)}">${esc(b.name)}</option>`).join("")}`;
      if ([...$("productCategoryFilter").options].some((option) => option.value === selectedCategory)) {
        $("productCategoryFilter").value = selectedCategory;
      }
      if ([...$("productBrandFilter").options].some((option) => option.value === selectedBrand)) {
        $("productBrandFilter").value = selectedBrand;
      }
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
    $("productsBody").innerHTML = rows.length ? `<table><thead><tr><th>Товар</th><th>Бренд</th><th>Категорії</th><th>Ціна</th><th>Статус / наявність</th><th>Параметри</th><th></th></tr></thead><tbody>${rows.map((p) => {
      const labels = (p.categoryKeys || [p.category]).map((key) => categoryCache.find((c) => c.key === key)?.label || key);
      const productImage = (p.images || []).find(Boolean) || (p.image && p.image !== "/placeholder.jpg" ? p.image : "");
      return `<tr class="${p.enabled === false ? "supplier-inactive" : ""}"><td><div class="product-cell"><div class="product-thumb${productImage ? "" : " missing"}">${productImage ? `<img data-product-thumb src="${esc(productImage)}" alt="">` : ""}</div><div><strong>${esc(p.name)}</strong><div class="muted" style="font-size:11px">${esc(p.id)}</div></div></div></td>
        <td>${esc(p.brand?.name || "—")}</td><td>${labels.map((label) => `<span class="badge" style="margin:2px">${esc(label)}</span>`).join("")}</td>
        <td class="nowrap"><strong>${p.price > 0 ? money(p.price) : "—"}</strong></td><td><span class="badge ${p.enabled === false ? "s-new" : "s-done"}">${p.enabled === false ? "Вимкнений" : "Активний"}</span><div class="muted">${esc(stockLabel(p.stock))}</div></td><td class="muted" style="font-size:12px">${[p.power, p.capacity, p.efficiency].filter(Boolean).map(esc).join(" · ") || "—"}</td>
        <td class="nowrap"><div class="row-actions"><button class="btn-sm btn-ghost" data-product-stock="${esc(p.id)}">Склад</button><button class="btn-sm btn-ghost" data-toggle-product="${esc(p.id)}">${p.enabled === false ? "Увімкнути" : "Вимкнути"}</button><button class="btn-sm btn-ghost" data-edit-product="${esc(p.id)}">Редагувати</button><button class="btn-sm btn-danger" data-del-product="${esc(p.id)}">Видалити</button></div></td></tr>`;
    }).join("")}</tbody></table>` : `<div class="empty">За цими фільтрами товарів немає</div>`;
    document.querySelectorAll("[data-product-thumb]").forEach((img) => img.addEventListener("error", () => {
      const frame = img.parentElement;
      img.remove();
      frame?.classList.add("missing");
    }));
    document.querySelectorAll("[data-product-stock]").forEach((button) => button.addEventListener("click", async () => {
      const product = productCache.find((p) => p.id === button.dataset.productStock);
      warehouseFilters.search = product.name;
      warehouseFilters.category = "all"; warehouseFilters.brand = "all";
      warehouseExpandedProduct = product.id;
      $("warehouseSearch").value = product.name;
      $("warehouseAvailabilityFilter").value = "all";
      document.querySelector('[data-tab="warehouse"]').click();
      document.querySelector('[data-wtab="balance"]').click();
    }));
    document.querySelectorAll("[data-edit-product]").forEach((b) => b.addEventListener("click", () => productModal(productCache.find((p) => p.id === b.dataset.editProduct))));
    document.querySelectorAll("[data-toggle-product]").forEach((b) => b.addEventListener("click", async () => {
      const product = productCache.find((p) => p.id === b.dataset.toggleProduct);
      if (!product) return;
      try { await api("/api/products/" + encodeURIComponent(product.id), { method: "PUT", body: JSON.stringify({ enabled: product.enabled === false }) }); loadProducts(); }
      catch (err) { alert(err.message); }
    }));
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

  function productModal(p, onSaved) {
    const isNew = !p;
    p = p || { id: "", name: "", category: "inverter", categoryKeys: ["inverter"], price: 0, features: [], image: "", images: [], enabled: true };
    const selectedCategoryKeys = new Set(p.categoryKeys || [p.category]);
    openModal(`
      <h3>${isNew ? "Новий товар" : "Редагувати товар"}</h3>
      <div class="field"><label>Slug (латиницею, напр. inv-5kw)</label><input id="m_id" value="${esc(p.id)}" /></div>
      <div class="field"><label>Назва</label><input id="m_name" value="${esc(p.name)}" /></div>
      <div class="field"><label style="display:flex;gap:8px;align-items:center;text-transform:none"><input id="m_enabled" type="checkbox" ${p.enabled === false ? "" : "checked"} style="width:auto"> Активний товар (показувати на сайті)</label></div>
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
      <div class="grid2">
        <div class="field"><label>Гарантія</label><input id="m_warranty" value="${esc(p.warranty ?? "")}" placeholder="напр. 1 рік" /></div>
        <div class="field"></div>
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
        enabled: $("m_enabled").checked,
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
        warranty: $("m_warranty").value.trim(),
        badge: $("m_badge").value.trim() || null,
        image: $("m_image").value.trim(),
        features: $("m_features").value.split("\n").map((s) => s.trim()).filter(Boolean),
      };
      try {
        await api(isNew ? "/api/products" : "/api/products/" + encodeURIComponent(p.id), {
          method: isNew ? "POST" : "PUT",
          body: JSON.stringify(body),
        });
        closeModal();
        loadProducts();
        if (onSaved) await onSaved();
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
  function categoryTree(cats) {
    const roots = cats.filter((c) => !c.parentKey);
    const rootKeys = new Set(roots.map((c) => c.key));
    const orphans = cats.filter((c) => c.parentKey && !rootKeys.has(c.parentKey));
    return roots.flatMap((root) => [root, ...cats.filter((c) => c.parentKey === root.key)]).concat(orphans);
  }

  async function loadCategories() {
    try {
      const cats = await api("/api/categories?all=1");
      categoryCache = cats;
      const tree = categoryTree(cats);
      $("categoriesBody").innerHTML = tree.length
        ? tree
            .map(
              (c) => {
                const siblings = cats.filter((x) => (x.parentKey || null) === (c.parentKey || null));
                const siblingIndex = siblings.findIndex((x) => x.key === c.key);
                return `<div class="pcard">
        <div class="cat">${c.parentKey ? "Підкатегорія" : "Категорія"} · ${esc(c.key)}${c.enabled ? "" : " · прихована"}</div>
        <h4>${c.parentKey ? "↳ " : ""}${esc(c.icon)} ${esc(c.label)}</h4>
        ${c.parentKey ? `<div class="muted" style="font-size:11px">Батьківська: ${esc((cats.find((x) => x.key === c.parentKey) || {}).label || c.parentKey)}</div>` : ""}
        <div class="muted" style="font-size:12px;margin-top:4px">${esc(c.description || "")}</div>
        <div class="muted" style="font-size:12px;margin-top:6px">Товарів: <b>${
          productCache.filter((p) => (p.categoryKeys || [p.category]).includes(c.key)).length
        }</b> · порядок: ${c.sortOrder}</div>
        <div class="acts">
          <button class="btn-sm btn-ghost" data-up-cat="${esc(c.key)}" ${siblingIndex === 0 ? "disabled" : ""} title="Перемістити вище">↑</button>
          <button class="btn-sm btn-ghost" data-down-cat="${esc(c.key)}" ${siblingIndex === siblings.length - 1 ? "disabled" : ""} title="Перемістити нижче">↓</button>
          <button class="btn-sm btn-ghost" data-edit-cat='${esc(JSON.stringify(c))}'>Редагувати</button>
          <button class="btn-sm btn-danger" data-del-cat="${esc(c.key)}">Видалити</button>
        </div></div>`;
              }
            )
            .join("")
        : `<div class="empty">Категорій немає</div>`;
      // make sure productCache is populated for the "Товарів" count
      if (!productCache.length) {
        productCache = await api("/api/products/admin/all");
        loadCategories();
        return;
      }
      document.querySelectorAll("[data-edit-cat]").forEach((b) =>
        b.addEventListener("click", () => categoryModal(JSON.parse(b.dataset.editCat)))
      );
      document.querySelectorAll("[data-up-cat]").forEach((b) =>
        b.addEventListener("click", () => moveCategory(b.dataset.upCat, -1))
      );
      document.querySelectorAll("[data-down-cat]").forEach((b) =>
        b.addEventListener("click", () => moveCategory(b.dataset.downCat, 1))
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

  async function moveCategory(key, direction) {
    const current = categoryCache.find((c) => c.key === key);
    if (!current) return;
    const siblings = categoryCache.filter((c) => (c.parentKey || null) === (current.parentKey || null));
    const index = siblings.findIndex((c) => c.key === key);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) return;

    [siblings[index], siblings[targetIndex]] = [siblings[targetIndex], siblings[index]];
    const roots = current.parentKey
      ? categoryCache.filter((category) => !category.parentKey)
      : siblings;
    const ordered = roots.flatMap((root) => [
      root,
      ...(current.parentKey === root.key
        ? siblings
        : categoryCache.filter((category) => category.parentKey === root.key)),
    ]);
    const orderedKeys = new Set(ordered.map((category) => category.key));
    const keys = ordered.concat(categoryCache.filter((category) => !orderedKeys.has(category.key))).map((category) => category.key);
    try {
      categoryCache = await api("/api/categories/reorder", { method: "PUT", body: JSON.stringify({ keys }) });
      loadCategories();
    } catch (err) {
      alert(err.message);
      loadCategories();
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
        api("/api/products/admin/all"),
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
      const [blocks, products] = await Promise.all([api("/api/content"), api("/api/products/admin/all")]);
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
        api("/api/products/admin/all"),
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

  // ── Warehouse ──────────────────────────────────────────────────────────────

  document.querySelectorAll(".warehouse-sub-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      warehouseSubTab = btn.dataset.wtab;
      document.querySelectorAll(".warehouse-sub-tab").forEach((b) => {
        b.style.color = b.dataset.wtab === warehouseSubTab ? "var(--slate-900)" : "var(--slate-500)";
        b.style.borderBottomColor = b.dataset.wtab === warehouseSubTab ? "var(--slate-900)" : "transparent";
        b.style.fontWeight = b.dataset.wtab === warehouseSubTab ? "700" : "600";
      });
      $("warehouse-balance-pane").style.display = warehouseSubTab === "balance" ? "" : "none";
      $("warehouse-reservations-pane").style.display = warehouseSubTab === "reservations" ? "" : "none";
      if (warehouseSubTab === "balance") loadWarehouseBalance();
      if (warehouseSubTab === "reservations") loadWarehouseReservations();
    });
  });

  async function loadWarehouse() {
    try {
      const [categories, brands] = await Promise.all([
        categoryCache.length ? Promise.resolve(categoryCache) : api("/api/categories?all=1").then((r) => { categoryCache = r; return r; }),
        brandCache.length ? Promise.resolve(brandCache) : api("/api/brands").then((r) => { brandCache = r; return r; }),
      ]);
      const catFilter = $("warehouseCategoryFilter");
      const brandFilter = $("warehouseBrandFilter");
      if (catFilter && catFilter.options.length <= 1) {
        categories.forEach((c) => { const o = document.createElement("option"); o.value = c.key; o.textContent = c.label; catFilter.appendChild(o); });
      }
      if (brandFilter && brandFilter.options.length <= 1) {
        brands.filter((b) => b.enabled).forEach((b) => { const o = document.createElement("option"); o.value = b.slug; o.textContent = b.name; brandFilter.appendChild(o); });
      }
      if (warehouseSubTab === "balance") await loadWarehouseBalance();
      else await loadWarehouseReservations();
    } catch (err) { console.error("loadWarehouse", err); }
  }

  async function loadWarehouseBalance() {
    const body = $("warehouseBalanceBody");
    if (!body) return;
    body.innerHTML = `<div class="empty">Завантаження…</div>`;
    try {
      const params = new URLSearchParams();
      if (warehouseFilters.search) params.set("search", warehouseFilters.search);
      if (warehouseFilters.category !== "all") params.set("category", warehouseFilters.category);
      if (warehouseFilters.brand !== "all") params.set("brand", warehouseFilters.brand);
      warehouseBalanceCache = await api("/api/warehouse/balance?" + params.toString());
      renderWarehouseBalance();
    } catch (err) { body.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
  }

  const warehouseDate = (date) => date ? date.slice(0, 10).split("-").reverse().join(".") : "—";
  function stockLabel(stock) { return !stock ? "Наявність уточнюється" : stock.availableQty > 0 ? `На складі · ${stock.availableQty} шт.` : stock.expectedQty > 0 ? `Очікуємо ${warehouseDate(stock.arrivalDate)} · лише бронювання` : stock.reservedQty > 0 ? "Усе в резерві" : "Немає на складі"; }
  let warehouseExpandedProduct = null;

  async function refreshWarehouseStock() {
    crmProductOptions = [];
    productCache = [];
    await loadWarehouseBalance();
  }

  function renderWarehouseBalance() {
    const body = $("warehouseBalanceBody");
    if (!body) return;
    const filter = $("warehouseAvailabilityFilter")?.value || "all";
    const rows = warehouseBalanceCache.filter((row) => filter === "all" || (filter === "in_stock" ? row.availableQty > 0 : filter === "preorder" ? row.expectedQty > 0 : row.totalQty === 0 && row.expectedQty === 0));
    $("warehouseFilterCount").textContent = `${rows.length} товарів`;
    if (!rows.length) { body.innerHTML = `<div class="empty">За цими фільтрами партій немає. Додайте партію існуючого товару.</div>`; return; }
    const isAdmin = currentAdmin?.role === "admin";
    body.innerHTML = `<div class="admin-table-wrap"><table class="warehouse-table">
      <thead><tr><th>Товар / наявність</th><th>На складі</th><th>Резерв</th><th>Вільно</th><th>Очікуємо</th><th>Ціна продажу</th><th></th></tr></thead>
      <tbody>${rows.map((row) => {
        const p = row.product;
        const expanded = warehouseExpandedProduct === p.id;
        const category = categoryCache.find((c) => c.key === p.category)?.label || p.category;
        return `<tr>
          <td><strong>${esc(p.name)}</strong><div class="muted">${esc(category)}${p.brandName ? " · " + esc(p.brandName) : ""}${p.enabled === false ? " · приховано на сайті" : ""}</div><div class="wh-stock ${row.availableQty > 0 ? "wh-stock-ready" : row.expectedQty > 0 ? "wh-stock-expected" : ""}">${esc(stockLabel(row))}</div></td>
          <td>${row.totalQty}</td><td>${row.reservedQty}</td><td><strong class="${row.availableQty > 0 ? "wh-stock-ready" : ""}">${row.availableQty}</strong></td><td>${row.expectedQty || "—"}</td>
          <td>${p.suggestedSalePrice > 0 ? money(p.suggestedSalePrice) : `<span class="muted">Не задана</span>`}</td>
          <td><button class="btn-sm btn-ghost" data-wh-expand="${esc(p.id)}" aria-expanded="${expanded}">${expanded ? "Згорнути" : `Партії (${row.warehouseItems.length})`}</button></td>
        </tr>${expanded ? `<tr class="wh-detail-row"><td colspan="7"><div class="wh-detail">
          <div class="wh-detail-head"><div><strong>Партії · ${esc(p.name)}</strong><div class="muted">Залишок партії — кількість без уже виділених резервів.</div></div>${isAdmin ? `<div class="row-actions"><button class="btn-sm" data-wh-add="${esc(p.id)}">+ Додати партію</button><button class="btn-sm btn-ghost" data-wh-product="${esc(p.id)}">Картка товару</button></div>` : ""}</div>
          ${row.warehouseItems.length ? `<div class="wh-batches">${row.warehouseItems.map((item) => `<div class="wh-batch ${item.quantity === 0 ? "wh-batch-empty" : ""}">
            <div><strong>${esc(item.supplier?.name || "Без постачальника")}</strong><div class="muted">Додано ${warehouseDate(item.createdAt)}${item.notes ? ` · ${esc(item.notes)}` : ""}</div></div>
            <div><strong>${item.quantity} шт.</strong><div class="muted">${item.purchasePrice != null ? `Закупівля ${money(item.purchasePrice)}` : "Ціну закупівлі не задано"}</div></div>
            <div>${item.arrivalDate ? `<span class="wh-stock-expected">Очікуємо ${warehouseDate(item.arrivalDate)}</span><div class="muted">Лише бронювання</div>` : item.quantity > 0 ? `<span class="wh-stock-ready">На складі</span>` : `<span class="muted">Порожня партія</span>`}</div>
            ${isAdmin ? `<div class="row-actions">${item.arrivalDate && item.quantity > 0 ? `<button class="btn-sm" data-wh-receive="${esc(item.id)}">Прийняти на склад</button>` : ""}<button class="btn-sm btn-ghost" data-wh-item="${esc(item.id)}">Редагувати</button><button class="btn-sm btn-danger" data-wh-delete="${esc(item.id)}">Видалити</button></div>` : ""}
          </div>`).join("")}</div>` : `<p class="muted">Партій немає</p>`}
          ${row.reservations.length ? `<div class="wh-reservations"><strong>Резерви клієнтів</strong>${row.reservations.map((r) => `<div>${esc(r.lead.name)} · ${esc(r.lead.phone)} <strong>${r.quantity} шт.</strong></div>`).join("")}</div>` : ""}
        </div></td></tr>` : ""}`;
      }).join("")}</tbody></table></div>`;
    body.querySelectorAll("[data-wh-expand]").forEach((button) => button.addEventListener("click", () => {
      warehouseExpandedProduct = warehouseExpandedProduct === button.dataset.whExpand ? null : button.dataset.whExpand;
      renderWarehouseBalance();
    }));
    body.querySelectorAll("[data-wh-add]").forEach((button) => button.addEventListener("click", () => addWarehouseItemModal(button.dataset.whAdd)));
    body.querySelectorAll("[data-wh-product]").forEach((button) => button.addEventListener("click", async () => {
      try {
        productCache = await api("/api/products/admin/all");
        const product = productCache.find((p) => p.id === button.dataset.whProduct);
        if (!product) throw new Error("Товар не знайдено");
        productModal(product, refreshWarehouseStock);
      } catch (err) { alert(err.message); }
    }));
    const findBatch = (id) => {
      const row = warehouseBalanceCache.find((r) => r.warehouseItems.some((i) => i.id === id));
      return { row, item: row.warehouseItems.find((i) => i.id === id) };
    };
    body.querySelectorAll("[data-wh-item]").forEach((button) => button.addEventListener("click", () => {
      const { row, item } = findBatch(button.dataset.whItem);
      warehouseItemModal(row.product, item);
    }));
    body.querySelectorAll("[data-wh-delete]").forEach((button) => button.addEventListener("click", async () => {
      const { row, item } = findBatch(button.dataset.whDelete);
      if (!confirm(`Видалити партію «${row.product.name}» (${item.quantity} шт., ${item.supplier?.name || "без постачальника"})? Залишок і наявність товару будуть перераховані.`)) return;
      button.disabled = true;
      try { await api("/api/warehouse/balance/" + encodeURIComponent(item.id), { method: "DELETE" }); await refreshWarehouseStock(); }
      catch (err) { alert(err.message); button.disabled = false; }
    }));
    body.querySelectorAll("[data-wh-receive]").forEach((button) => button.addEventListener("click", async () => {
      const { row, item } = findBatch(button.dataset.whReceive);
      if (!confirm(`Підтвердити фактичне надходження ${item.quantity} шт. «${row.product.name}»?`)) return;
      button.disabled = true;
      try { await api("/api/warehouse/balance/" + encodeURIComponent(item.id), { method: "PUT", body: JSON.stringify({ arrivalDate: null }) }); await refreshWarehouseStock(); }
      catch (err) { alert(err.message); button.disabled = false; }
    }));
  }

  async function warehouseItemModal(product, item) {
    if (currentAdmin?.role !== "admin") return;
    try {
      supplierCache = await api("/api/crm/suppliers");
      openModal(`<h3>Редагувати партію</h3><p>${esc(product.name)}</p>
        <div class="grid2"><div class="field"><label>Кількість</label><input id="wh_edit_qty" type="number" min="0" step="1" value="${item.quantity}"></div>
        <div class="field"><label>Ціна закупівлі ($)</label><input id="wh_edit_price" type="number" min="0" step="1" value="${item.purchasePrice ?? ""}"></div></div>
        <div class="field"><label>Постачальник</label><select id="wh_edit_supplier"><option value="">Без постачальника</option>${supplierCache.filter((s) => s.active || s.id === item.supplierId).map((s) => `<option value="${esc(s.id)}" ${s.id === item.supplierId ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></div>
        <div class="field"><label for="wh_edit_arrival">Очікувана дата надходження · лише бронювання</label><input id="wh_edit_arrival" type="date" value="${esc(item.arrivalDate || "")}"><div class="muted">Для підтвердження надходження скористайтеся кнопкою «Прийняти на склад» у списку партій.</div></div>
        <div class="field"><label>Нотатки</label><textarea id="wh_edit_notes" maxlength="500">${esc(item.notes)}</textarea></div>
        <div class="error" id="wh_edit_error"></div><div class="modal-actions"><button class="btn btn-ghost" id="wh_edit_cancel">Скасувати</button><button class="btn" id="wh_edit_save">Зберегти</button></div>`);
      $("wh_edit_cancel").addEventListener("click", closeModal);
      $("wh_edit_save").addEventListener("click", async () => {
        const quantity = Number($("wh_edit_qty").value);
        const purchasePrice = $("wh_edit_price").value === "" ? null : Number($("wh_edit_price").value);
        if ($("wh_edit_qty").value === "" || !Number.isSafeInteger(quantity) || quantity < 0 || (purchasePrice !== null && (!Number.isSafeInteger(purchasePrice) || purchasePrice < 0))) {
          $("wh_edit_error").textContent = "Вкажіть цілі невід’ємні кількість та ціну";
          return;
        }
        const button = $("wh_edit_save");
        button.disabled = true;
        try {
          await api("/api/warehouse/balance/" + encodeURIComponent(item.id), { method: "PUT", body: JSON.stringify({ quantity, purchasePrice, arrivalDate: $("wh_edit_arrival").value || null, supplierId: $("wh_edit_supplier").value || null, notes: $("wh_edit_notes").value.trim() }) });
          closeModal();
          await refreshWarehouseStock();
        } catch (err) { $("wh_edit_error").textContent = err.message; button.disabled = false; }
      });
    } catch (err) { alert(err.message); }
  }

  async function loadWarehouseReservations() {
    const body = $("warehouseReservationsBody");
    if (!body) return;
    body.innerHTML = `<div class="empty">Завантаження…</div>`;
    try {
      const status = warehouseResFilter !== "all" ? `?status=${warehouseResFilter}` : "";
      warehouseResCache = await api("/api/warehouse/reservations" + status);
      renderWarehouseReservations();
    } catch (err) { body.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
  }

  function renderWarehouseReservations() {
    const body = $("warehouseReservationsBody");
    if (!body) return;
    const supplierOptions = supplierCache.length ? supplierCache.filter((s) => s.active).map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("") : "";
    if (!warehouseResCache.length) { body.innerHTML = `<div class="empty" style="padding:48px;text-align:center">Резервів немає</div>`; return; }
    body.innerHTML = warehouseResCache.map((r) => {
      const cls = r.status === "searching" ? "res-searching" : r.status === "found" ? "res-found" : "";
      const statusBadge = r.status === "searching" ? `<span class="badge" style="background:#fde68a;color:#78350f">🔍 Шукаємо</span>` : r.status === "active" ? `<span class="badge" style="background:#d1fae5;color:#065f46">📦 Зарезервовано</span>` : r.status === "found" ? `<span class="badge" style="background:#bbf7d0;color:#14532d">✅ Знайдено</span>` : `<span class="badge">${esc(r.status)}</span>`;
      const searchEdit = currentAdmin?.role === "admin" && r.status === "searching" ? `<div class="res-edit-row">
        <div class="field" style="margin:0"><label>Хто шукає</label><input class="res-searcher" data-res-id="${esc(r.id)}" value="${esc(r.searcherName)}" placeholder="Ім'я менеджера"></div>
        <div class="field" style="margin:0"><label>Статус пошуку</label><select class="res-search-status" data-res-id="${esc(r.id)}">
          <option value="searching" ${r.searchStatus === "searching" ? "selected" : ""}>В пошуку</option>
          <option value="not_found" ${r.searchStatus === "not_found" ? "selected" : ""}>Не знайдено</option>
          <option value="found" ${r.searchStatus === "found" ? "selected" : ""}>Знайдено</option>
        </select></div>
        <div class="field" style="margin:0"><label>Постачальник</label><select class="res-supplier" data-res-id="${esc(r.id)}"><option value="">— Не вибрано —</option>${supplierOptions.replace(`value="${esc(r.supplierId)}"`, `value="${esc(r.supplierId)}" selected`)}</select></div>
        <div style="display:flex;align-items:flex-end"><button class="btn btn-sm" data-save-res="${esc(r.id)}">Зберегти</button></div>
      </div>` : "";
      return `<div class="res-card ${cls}" data-reservation-id="${esc(r.id)}">
        <div class="res-head">
          <div>
            <div class="res-product">${esc(r.product.name)}</div>
            <div class="res-client"><a href="tel:${esc(r.lead.phone)}">${esc(r.lead.name)} · ${esc(r.lead.phone)}</a> · CRM: ${esc(STATUS_LABEL[r.lead.status] || r.lead.status)}</div>
            ${r.supplier ? `<div style="font-size:12px;color:var(--slate-500);margin-top:3px">Постачальник: ${esc(r.supplier.name)}</div>` : ""}
            ${r.searcherName ? `<div style="font-size:12px;color:var(--slate-500)">Шукає: ${esc(r.searcherName)}</div>` : ""}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            ${statusBadge}
            <div style="font-size:11px;color:var(--slate-400)">${new Date(r.createdAt).toLocaleDateString("uk-UA")}</div>
          </div>
        </div>
        ${searchEdit}
      </div>`;
    }).join("");

    body.querySelectorAll("[data-save-res]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.saveRes;
        const searcherName = body.querySelector(`.res-searcher[data-res-id="${id}"]`)?.value.trim() || "";
        const searchStatus = body.querySelector(`.res-search-status[data-res-id="${id}"]`)?.value || "searching";
        const supplierId = body.querySelector(`.res-supplier[data-res-id="${id}"]`)?.value || null;
        try {
          await api("/api/warehouse/reservations/" + id, { method: "PATCH", body: JSON.stringify({ searcherName, searchStatus, supplierId: supplierId || null }) });
          await loadWarehouseReservations();
        } catch (err) { alert(err.message); }
      });
    });
  }

  async function addWarehouseItemModal(productId = "") {
      if (currentAdmin?.role !== "admin") return;
      if (!productCache.length) productCache = await api("/api/products/admin/all").catch(() => []);
      if (!supplierCache.length) supplierCache = await api("/api/crm/suppliers").catch(() => []);
      openModal(`<h3>Додати партію на склад</h3>
        <div class="field"><label>Товар *</label>
          <input id="wh_product_search" type="search" placeholder="Пошук…" style="margin-bottom:8px">
          <select id="wh_product_select" style="width:100%;padding:10px;border:1px solid var(--slate-200);border-radius:8px;font-family:inherit;font-size:14px">
            <option value="">— Оберіть товар —</option>
            ${productCache.filter((p) => p.enabled).map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}
          </select>
        </div>
        <div class="grid2">
          <div class="field"><label>Кількість *</label><input id="wh_quantity" type="number" min="1" value="1"></div>
          <div class="field"><label>Ціна закупівлі ($)</label><input id="wh_price" type="number" min="0" placeholder="0"></div>
        </div>
        <div class="field"><label>Постачальник</label><select id="wh_supplier" style="width:100%;padding:10px;border:1px solid var(--slate-200);border-radius:8px;font-family:inherit;font-size:14px"><option value="">— Не вибрано —</option>${supplierCache.filter((s) => s.active).map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}</select></div>
        <div class="field"><label for="wh_arrival">Очікувана дата надходження · лише бронювання</label><input id="wh_arrival" type="date"><div class="muted">З датою — очікувана партія, доступна лише для бронювання. Без дати — товар уже на складі.</div></div>
        <div class="field"><label>Нотатки</label><input id="wh_notes" placeholder="Опис партії, серійний номер…"></div>
        <div class="error" id="wh_error"></div>
        <div class="modal-actions"><button class="btn btn-ghost" id="wh_cancel">Скасувати</button><button class="btn" id="wh_save">Додати на склад</button></div>`);
      const renderProductOpts = (q = "") => {
        const items = q ? productCache.filter((p) => p.enabled && p.name.toLocaleLowerCase("uk-UA").includes(q.toLocaleLowerCase("uk-UA"))) : productCache.filter((p) => p.enabled);
        $("wh_product_select").innerHTML = `<option value="">${items.length ? "— Оберіть товар —" : "Не знайдено"}</option>${items.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}`;
      };
      if (productId) $("wh_product_select").value = productId;
      $("wh_product_search").addEventListener("input", (e) => renderProductOpts(e.target.value));
      $("wh_cancel").addEventListener("click", closeModal);
      $("wh_save").addEventListener("click", async () => {
        const productId = $("wh_product_select").value;
        const quantity = parseInt($("wh_quantity").value, 10);
        if (!productId || !quantity || quantity < 1) return ($("wh_error").textContent = "Оберіть товар та вкажіть кількість");
        try {
          await api("/api/warehouse/balance", { method: "POST", body: JSON.stringify({ productId, quantity, arrivalDate: $("wh_arrival").value || null, supplierId: $("wh_supplier").value || null, purchasePrice: $("wh_price").value ? parseInt($("wh_price").value, 10) : null, notes: $("wh_notes").value.trim() }) });
          closeModal(); await refreshWarehouseStock();
        } catch (err) { $("wh_error").textContent = err.message; }
      });
  }
  $("addWarehouseItem")?.addEventListener("click", () => addWarehouseItemModal());
  $("warehouseAvailabilityFilter")?.addEventListener("change", renderWarehouseBalance);

  if ($("warehouseSearch")) $("warehouseSearch").addEventListener("input", (e) => { warehouseFilters.search = e.target.value; loadWarehouseBalance(); });
  if ($("warehouseCategoryFilter")) $("warehouseCategoryFilter").addEventListener("change", (e) => { warehouseFilters.category = e.target.value; loadWarehouseBalance(); });
  if ($("warehouseBrandFilter")) $("warehouseBrandFilter").addEventListener("change", (e) => { warehouseFilters.brand = e.target.value; loadWarehouseBalance(); });
  if ($("warehouseResFilter")) $("warehouseResFilter").addEventListener("change", (e) => { warehouseResFilter = e.target.value; loadWarehouseReservations(); });

  // ── bootstrap ────────────────────────────────────────────────────────────────
  (async function init() {
    if (!token) return;
    try {
      const me = await api("/api/auth/me");
      showApp(me.admin);
    } catch {
      logout();
    }
  })();
})();
