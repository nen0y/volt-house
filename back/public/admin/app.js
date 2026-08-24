/* VoltHouse admin panel — vanilla JS SPA */
(function () {
  const API = ""; // same origin
  const TOKEN_KEY = "vh_admin_token";
  let token = localStorage.getItem(TOKEN_KEY) || null;
  let productCache = []; // products list reused by content/calculator pickers
  let contentCache = {};
  let categoryCache = []; // categories reused by the product form
  let homeCache = []; // home sections

  // ── helpers ────────────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => (n == null ? "—" : "$" + Number(n).toLocaleString("en-US"));
  const dt = (s) => new Date(s).toLocaleString("uk-UA", { dateStyle: "short", timeStyle: "short" });

  const TYPE_LABEL = { order: "Замовлення", consultation: "Консультація", callback: "Дзвінок" };
  const STATUS_LABEL = { new: "Нова", in_progress: "В роботі", done: "Завершено" };

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
    $("login").style.display = "none";
    $("app").style.display = "block";
    $("who").textContent = email;
    loadSeoSetting();
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
      loadLeads();
    } catch (err) {
      $("loginError").textContent = err.message;
    }
  });
  $("logout").addEventListener("click", logout);

  // ── tabs ──────────────────────────────────────────────────────────────────
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      ["leads", "products", "categories", "home", "testimonials", "content", "calculator"].forEach((t) => {
        $("tab-" + t).style.display = t === tab ? "block" : "none";
      });
      if (tab === "leads") loadLeads();
      if (tab === "products") loadProducts();
      if (tab === "categories") loadCategories();
      if (tab === "home") loadHomeSections();
      if (tab === "testimonials") loadTestimonials();
      if (tab === "content") loadContent();
      if (tab === "calculator") loadCalculator();
    });
  });

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
        const statusOpts = ["new", "in_progress", "done"]
          .map((s) => `<option value="${s}" ${s === l.status ? "selected" : ""}>${STATUS_LABEL[s]}</option>`)
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
  async function loadProducts() {
    try {
      const [products, cats] = await Promise.all([api("/api/products"), api("/api/categories?all=1")]);
      productCache = products;
      categoryCache = cats;
      $("productsBody").innerHTML = products.length
        ? products
            .map(
              (p) => `<div class="pcard">
        <div class="cat">${esc(p.category)}</div>
        <h4>${esc(p.name)}</h4>
        <div class="price">${money(p.price)} ${
                p.originalPrice ? `<span class="muted" style="text-decoration:line-through;font-weight:400">${money(p.originalPrice)}</span>` : ""
              }</div>
        <div class="muted" style="font-size:12px;margin-top:4px">${[p.power, p.capacity, p.efficiency, p.warranty]
          .filter(Boolean)
          .map(esc)
          .join(" · ")}</div>
        <div class="acts">
          <button class="btn-sm btn-ghost" data-edit-product='${esc(JSON.stringify(p))}'>Редагувати</button>
          <button class="btn-sm btn-danger" data-del-product="${esc(p.id)}">Видалити</button>
        </div>
      </div>`
            )
            .join("")
        : `<div class="empty">Товарів немає</div>`;

      document.querySelectorAll("[data-edit-product]").forEach((b) =>
        b.addEventListener("click", () => productModal(JSON.parse(b.dataset.editProduct)))
      );
      document.querySelectorAll("[data-del-product]").forEach((b) =>
        b.addEventListener("click", async () => {
          if (!confirm("Видалити товар?")) return;
          try {
            await api("/api/products/" + b.dataset.delProduct, { method: "DELETE" });
            loadProducts();
          } catch (err) {
            alert(err.message);
          }
        })
      );
    } catch (err) {
      $("productsBody").innerHTML = `<div class="empty">${esc(err.message)}</div>`;
    }
  }

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
    p = p || { id: "", name: "", category: "inverter", price: 0, warranty: "", features: [], image: "", images: [] };
    openModal(`
      <h3>${isNew ? "Новий товар" : "Редагувати товар"}</h3>
      <div class="field"><label>ID (латиницею, напр. inv-5kw)</label><input id="m_id" value="${esc(p.id)}" ${
      isNew ? "" : "readonly"
    } /></div>
      <div class="field"><label>Назва</label><input id="m_name" value="${esc(p.name)}" /></div>
      <div class="grid2">
        <div class="field"><label>Категорія</label><select id="m_category">
          ${(() => {
            const keys = categoryCache.length ? categoryCache.map((c) => c.key) : ["inverter", "battery", "solar", "station"];
            if (p.category && !keys.includes(p.category)) keys.unshift(p.category);
            return keys
              .map((k) => {
                const c = categoryCache.find((x) => x.key === k);
                return `<option value="${esc(k)}" ${k === p.category ? "selected" : ""}>${esc(c ? c.label : k)}</option>`;
              })
              .join("");
          })()}
        </select></div>
        <div class="field"><label>Гарантія</label><input id="m_warranty" value="${esc(p.warranty)}" /></div>
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
        <div class="cat">${esc(c.key)}${c.enabled ? "" : " · прихована"}</div>
        <h4>${esc(c.icon)} ${esc(c.label)}</h4>
        <div class="muted" style="font-size:12px;margin-top:4px">${esc(c.description || "")}</div>
        <div class="muted" style="font-size:12px;margin-top:6px">Товарів: <b>${
          productCache.filter((p) => p.category === c.key).length
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
    c = c || { key: "", label: "", labelSingular: "", description: "", icon: "📦", sortOrder: 0, enabled: true };
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
      .map((p) => `<option value="${esc(p.id)}" ${s.productIds.includes(p.id) ? "selected" : ""}>${esc(p.name)} (${esc(p.category)})</option>`)
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
            p.category
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
      loadLeads();
    } catch {
      logout();
    }
  })();
})();
