// PERSISTENT STOREFRONT PRODUCTS DATABASE SYNCHRONIZER
function loadProductsDB() {
  try {
    const local = localStorage.getItem("hx_products_db");
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && Array.isArray(parsed) && parsed.length >= 10) return parsed;
    }
  } catch(e) {}
  
  const full = (window.HX_PRODUCTS && Array.isArray(window.HX_PRODUCTS) && window.HX_PRODUCTS.length >= 10) ? window.HX_PRODUCTS : [];
  if (full.length >= 10) {
    try { localStorage.setItem("hx_products_db", JSON.stringify(full)); } catch(e) {}
  }
  return full;
}

let P = loadProductsDB();

function getProducts() {
  if (Array.isArray(P) && P.length >= 10) return P;
  P = loadProductsDB();
  if (!Array.isArray(P) || P.length < 10) {
    P = (window.HX_PRODUCTS && window.HX_PRODUCTS.length >= 10) ? window.HX_PRODUCTS : [];
  }
  return P;
}

const $ = (q, r = document) => r.querySelector(q);
const $$ = (q, r = document) => [...r.querySelectorAll(q)];
const INR = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
const openModal = id => $("#" + id)?.classList.add("open");
const closeEl = el => el.closest(".modal,.drawer")?.classList.remove("open");

function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2400);
}

// ROBUST MULTI-IMAGE GALLERY PARSER
function parseImagesArray(p) {
  let list = [];
  if (Array.isArray(p.images) && p.images.length) {
    list = p.images;
  } else if (typeof p.images === "string" && p.images.trim()) {
    try {
      const parsed = JSON.parse(p.images);
      if (Array.isArray(parsed) && parsed.length) list = parsed;
      else list = p.images.split(',').map(x => x.trim()).filter(Boolean);
    } catch(e) {
      list = p.images.split(',').map(x => x.trim()).filter(Boolean);
    }
  }

  if (p.image && !list.includes(p.image)) {
    list.unshift(p.image);
  }

  const cleanList = [...new Set(list)].filter(x => x && x.length > 5);
  return cleanList.length ? cleanList : [p.image || 'assets/products/H104020-R.webp'];
}

// INTERACTIVE HERO IMAGE SWITCHER
window.switchHeroImage = function(src, el) {
  const main = document.getElementById("mainProdImg");
  if (main) {
    main.style.opacity = "0.4";
    setTimeout(() => {
      main.src = src;
      main.style.opacity = "1";
    }, 120);
  }
  const parent = el.parentElement;
  if (parent) {
    [...parent.children].forEach(c => {
      c.style.border = "1px solid var(--line)";
    });
    el.style.border = "2.5px solid #1488d8";
  }
};

// ASYNC LIVE BACKEND SERVER DATABASE FETCH
async function fetchLiveBackendProducts() {
  try {
    const res = await fetch('/api/products-crud');
    const data = await res.json();
    if (data && data.products && Array.isArray(data.products) && data.products.length >= 10) {
      P = data.products;
      window.HX_PRODUCTS = P;
      localStorage.setItem("hx_products_db", JSON.stringify(P));
      reRenderAllStorefrontPages();
    }
  } catch(e) {}
}

function reRenderAllStorefrontPages() {
  P = getProducts();
  if (typeof homeInit === "function") homeInit();
  if (typeof shopInit === "function") shopInit();
  if (typeof productInit === "function") productInit();
  if (typeof renderCartDrawer === "function") renderCartDrawer();
  if (typeof renderCategoryCarousels === "function") renderCategoryCarousels();
}

window.addEventListener("storage", (e) => {
  if (e.key === "hx_products_db") {
    P = loadProductsDB();
    window.HX_PRODUCTS = P;
    reRenderAllStorefrontPages();
  }
});

window.addEventListener("hx_stock_update", (e) => {
  if (e.detail && e.detail.length >= 10) {
    P = e.detail;
    window.HX_PRODUCTS = P;
    reRenderAllStorefrontPages();
  }
});

// LOCAL STORAGE HELPERS
const getCart = () => JSON.parse(localStorage.getItem("hx_cart") || "{}");
const setCart = c => localStorage.setItem("hx_cart", JSON.stringify(c));
const getWish = () => JSON.parse(localStorage.getItem("hx_wish") || "[]");
const setWish = w => localStorage.setItem("hx_wish", JSON.stringify(w));

function addCart(id, qty = 1) {
  const p = getProducts().find(x => x.id === id);
  if (!p) return;

  const stock = p.stock !== undefined ? p.stock : 25;
  if (stock === 0) {
    toast(`Sorry, "${p.name}" is currently Out of Stock.`);
    return;
  }

  const c = getCart();
  const currentInCart = c[id] || 0;
  const newQty = currentInCart + Number(qty);

  if (newQty > stock) {
    toast(`Only ${stock} units available in stock for "${p.name}".`);
    c[id] = stock;
  } else {
    c[id] = newQty;
    toast(`Added ${qty} × "${p.name}" to cart ✓`);
  }

  setCart(c);
  updateCount();
  renderCartDrawer();
}

function removeCart(id) {
  const c = getCart();
  delete c[id];
  setCart(c);
  updateCount();
  renderCartDrawer();
  if (typeof renderCartPage === "function") renderCartPage();
}

function setQty(id, q) {
  const p = getProducts().find(x => x.id === id);
  const stock = p && p.stock !== undefined ? p.stock : 25;

  const c = getCart();
  if (q <= 0) {
    delete c[id];
  } else if (q > stock) {
    toast(`Max available stock for this model is ${stock} units.`);
    c[id] = stock;
  } else {
    c[id] = Number(q);
  }

  setCart(c);
  updateCount();
  renderCartDrawer();
  if (typeof renderCartPage === "function") renderCartPage();
}

function updateCount() {
  const c = getCart();
  const count = Object.values(c).reduce((a, b) => a + b, 0);
  $$(".cart-count").forEach(el => el.textContent = count);
}

function toggleWish(id) {
  let w = getWish();
  w = w.includes(id) ? w.filter(x => x !== id) : [...w, id];
  setWish(w);
  $$(`[data-wish="${id}"]`).forEach(b => {
    b.classList.toggle("on", w.includes(id));
    b.textContent = w.includes(id) ? "♥" : "♡";
  });
  toast(w.includes(id) ? "Saved to wishlist" : "Removed from wishlist");
}

/* 4-COLUMN RESPONSIVE PRODUCT CARD WITH REAL-TIME STOCK BADGES */
function productCard(p) {
  const w = getWish().includes(p.id);
  const specs = [p.scale, p.drive, p.speed].filter(x => x && x !== "Not specified").join(" · ");
  
  const stock = p.stock !== undefined ? p.stock : 25;
  let stockBadgeHTML = `<span style="font-size:10px;font-weight:900;color:#2e7d32;display:block;margin-top:4px">🟢 In Stock (${stock} Units)</span>`;
  let buyBtnHTML = `<button class="mini-btn solid" onclick="addCart(${p.id})">Add to cart</button>`;

  if (stock === 0) {
    stockBadgeHTML = `<span style="font-size:10px;font-weight:900;color:#ed1c24;display:block;margin-top:4px">🔴 Out of Stock (Sold Out)</span>`;
    buyBtnHTML = `<button class="mini-btn solid" style="background:#888;cursor:not-allowed" disabled>Out of Stock</button>`;
  } else if (stock <= 5) {
    stockBadgeHTML = `<span style="font-size:10px;font-weight:900;color:#b78103;display:block;margin-top:4px">🟡 Only ${stock} Units Left!</span>`;
  }

  return `<article class="product-card">
    <div class="product-media">
      <a href="product.html?id=${p.id}"><img loading="lazy" src="${p.image}" alt="${esc(p.name)}"></a>
      <span class="tag">${esc(p.category)}</span>
      ${p.discount ? `<span class="tag sale-tag">${p.discount}% OFF</span>` : ""}
      <button class="wish ${w ? "on" : ""}" data-wish="${p.id}" onclick="toggleWish(${p.id})">${w ? "♥" : "♡"}</button>
    </div>
    <div class="product-meta">
      <div class="sku">HYPERXGT · ${esc(p.sku)}</div>
      <a href="product.html?id=${p.id}"><h3>${esc(p.name)}</h3></a>
      <p>${esc(specs || (p.scale + " · " + p.drive))}</p>
      ${stockBadgeHTML}
      <div class="price" style="margin-top:6px">
        <strong>${INR(p.price)}</strong>
        ${p.mrp > p.price ? `<del>${INR(p.mrp)}</del>` : ""}
      </div>
      <div class="product-actions">
        <button class="mini-btn quick" onclick="quickView(${p.id})">Quick view</button>
        ${buyBtnHTML}
      </div>
    </div>
  </article>`;
}

function renderFullSpecGrid(p) {
  const specs = [
    ["Scale", p.scale],
    ["Top Speed", p.speed],
    ["Drive System", p.drive],
    ["Motor Type", p.motor],
    ["Battery Spec", p.battery],
    ["Control System", p.control],
    ["Dimensions", p.dimensions],
    ["Weight", p.weight],
    ["Recommended Age", p.age],
    ["Brand", p.brand]
  ];

  return specs.map(x => `<div><b>${esc(x[0])}</b><span>${esc(x[1] || "Standard")}</span></div>`).join("");
}

function quickView(id) {
  const p = getProducts().find(x => x.id === id);
  if (!p) return;

  const stock = p.stock !== undefined ? p.stock : 25;
  let stockBadge = `<span style="font-size:11px;font-weight:900;color:#2e7d32">🟢 In Stock (${stock} Units)</span>`;
  let btnHTML = `<button class="btn dark" onclick="addCart(${p.id})">Add to Cart 🛒</button>`;
  
  if (stock === 0) {
    stockBadge = `<span style="font-size:11px;font-weight:900;color:#ed1c24">🔴 Out of Stock</span>`;
    btnHTML = `<button class="btn dark" style="background:#888;cursor:not-allowed" disabled>Out of Stock</button>`;
  } else if (stock <= 5) {
    stockBadge = `<span style="font-size:11px;font-weight:900;color:#b78103">🟡 Only ${stock} Left!</span>`;
  }

  $("#quickBox").innerHTML = `<div class="drawer-head"><b>Quick View</b><button class="x" onclick="closeEl(this)">×</button></div>
  <div style="display:grid;grid-template-columns:180px 1fr;gap:20px;align-items:center;margin-top:20px">
    <img src="${p.image}" style="width:180px;height:160px;object-fit:contain;background:#f6f6f6;border-radius:14px">
    <div>
      <div class="eyebrow">${esc(p.category)} · ${esc(p.sku)}</div>
      <h3 style="margin:8px 0">${esc(p.name)}</h3>
      <div style="margin-bottom:8px">${stockBadge}</div>
      <div class="price"><strong>${INR(p.price)}</strong>${p.mrp > p.price ? `<del>${INR(p.mrp)}</del>` : ""}</div>
      <p style="font-size:11px;color:#666;margin-top:4px">${esc(p.scale)} · ${esc(p.speed)} · ${esc(p.drive)}</p>
      <div class="modal-row" style="margin-top:14px">
        ${btnHTML}
        <a class="btn" href="product.html?id=${p.id}">Full product page</a>
      </div>
    </div>
  </div>`;
  openModal("quickModal");
}

function renderCartDrawer() {
  const root = $("#cartItems");
  if (!root) return;
  const c = getCart(), ids = Object.keys(c).map(Number);
  if (!ids.length) {
    root.innerHTML = '<div class="empty">Your cart is currently empty.</div>';
    $("#cartSummary").style.display = "none";
    return;
  }

  let subtotal = 0;
  root.innerHTML = ids.map(id => {
    const p = getProducts().find(x => x.id === id);
    if (!p) return "";
    const qty = c[id];
    const itemTotal = p.price * qty;
    subtotal += itemTotal;
    const stock = p.stock !== undefined ? p.stock : 25;

    return `<div class="cart-item">
      <img src="${p.image}" alt="${esc(p.name)}">
      <div>
        <b>${esc(p.name)}</b>
        <div style="font-size:10px;color:#666">${esc(p.sku)} · ${stock > 0 ? `In Stock (${stock} avail)` : 'Out of stock'}</div>
        <div class="price" style="margin-top:4px"><strong>${INR(p.price)}</strong> × ${qty} = ${INR(itemTotal)}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
          <button class="qty-btn" onclick="setQty(${id}, ${qty - 1})">-</button>
          <span style="font-size:12px;font-weight:900">${qty}</span>
          <button class="qty-btn" onclick="setQty(${id}, ${qty + 1})">+</button>
        </div>
      </div>
      <button class="remove" onclick="removeCart(${id})">Remove</button>
    </div>`;
  }).join("");

  $("#cartSummary").style.display = "block";
  if ($("#cartSubtotal")) $("#cartSubtotal").textContent = INR(subtotal);
}

function initChrome() {
  updateCount();
  renderCartDrawer();
  $$("[data-modal]").forEach(b => b.addEventListener("click", e => {
    e.preventDefault();
    openModal(b.dataset.modal);
  }));
  $$(".modal .shade,.drawer .shade,.x").forEach(el => el.addEventListener("click", () => closeEl(el)));
  const co = $("#cartOpen");
  if (co) co.onclick = () => $("#cartDrawer").classList.add("open");

  const tb = $("#trackBtn");
  if (tb) tb.onclick = async () => {
    const o = $("#trackOrder")?.value.trim() || "HX-10482";
    $("#trackResult").innerHTML = '<div style="margin-top:14px;font-size:11px;color:#888">Fetching live tracking status...</div>';
    try {
      const res = await fetch('/api/track-order?orderId=' + encodeURIComponent(o));
      const data = await res.json();
      if (data.success && data.tracking) {
        const t = data.tracking;
        $("#trackResult").innerHTML = `<div style="margin-top:18px;padding:18px;border-radius:16px;background:#f4f6ff;border:1px solid #dfe4ff;text-align:left">
          <div style="font-size:12px;font-weight:900;color:#1488d8">Order ${esc(t.orderId)} · ${esc(t.courier)}</div>
          <div style="font-size:11px;color:#555;margin-top:4px">AWB Tracking: <strong>${esc(t.trackingNumber)}</strong></div>
          <div style="font-size:11px;color:#2e7d32;font-weight:800;margin-top:4px">Est. Delivery: ${esc(t.estimatedDelivery)}</div>
        </div>`;
      }
    } catch(err) {}
  };
}

// CATEGORY PRODUCT CAROUSELS
function renderCategoryCarousels() {
  const container = $("#categoryCarousels");
  if (!container) return;

  const productsList = getProducts();
  const categories = ["Racing Cars", "Drift Cars", "Monster Trucks", "Off Road Crawlers", "Buggies & Truggies", "Mini RC"];

  container.innerHTML = categories.map(cat => {
    const catProducts = productsList.filter(p => p.category === cat).slice(0, 10);
    if (!catProducts.length) return "";

    const cardsHTML = catProducts.map(p => {
      const stock = p.stock !== undefined ? p.stock : 25;
      return `
        <div class="carousel-card" style="flex:0 0 270px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px;scroll-snap-align:start;display:flex;flex-direction:column;justify-content:space-between">
          <a href="product.html?id=${p.id}">
            <img src="${p.image}" alt="${esc(p.name)}" style="width:100%;height:165px;object-fit:contain;background:#f8f9fa;border-radius:12px;padding:10px">
            <div style="font-size:9px;font-weight:900;color:#1488d8;margin-top:10px">${esc(p.category)} · ${esc(p.sku)}</div>
            <h4 style="font-size:13px;line-height:1.3;margin:4px 0 8px;color:#111;min-height:34px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(p.name)}</h4>
          </a>
          <div>
            <div style="font-size:10px;font-weight:900;color:${stock > 0 ? '#2e7d32' : '#ed1c24'}">${stock > 0 ? `🟢 In Stock (${stock})` : '🔴 Out of Stock'}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
              <strong style="font-size:15px;color:#111">${INR(p.price)}</strong>
              <button class="mini-btn solid" onclick="addCart(${p.id})" style="height:32px;padding:0 12px">Add 🛒</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    const carouselId = "car_" + cat.replace(/[^a-zA-Z]/g, "");

    return `
      <div style="margin-bottom:48px">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px">
          <div>
            <div class="eyebrow">${esc(cat)} Collection</div>
            <h3 style="font-size:24px;font-weight:900;margin-top:4px">${esc(cat)}</h3>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button onclick="scrollCarousel('${carouselId}', -300)" style="width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:#fff;font-weight:900;cursor:pointer">‹</button>
            <button onclick="scrollCarousel('${carouselId}', 300)" style="width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:#fff;font-weight:900;cursor:pointer">›</button>
            <a href="shop.html?cat=${encodeURIComponent(cat)}" class="btn clear" style="height:36px;padding:0 14px;display:inline-flex;align-items:center;background:#f0f2f5;color:#111;font-size:11px">View All (${productsList.filter(p=>p.category===cat).length}) →</a>
          </div>
        </div>
        <div id="${carouselId}" style="display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;padding-bottom:12px;-webkit-overflow-scrolling:touch">
          ${cardsHTML}
        </div>
      </div>
    `;
  }).join("");
}

window.scrollCarousel = function(id, offset) {
  const el = document.getElementById(id);
  if (el) el.scrollBy({ left: offset, behavior: 'smooth' });
};

// BRAND COLLABORATIONS CAROUSEL
async function renderCollaborationsRail() {
  const container = $("#collaborationsRail");
  if (!container) return;

  try {
    const res = await fetch('/api/collaborations');
    const data = await res.json();
    const collabs = (data && data.collaborations) ? data.collaborations.filter(c => c.active) : [];

    if (collabs.length) {
      container.innerHTML = collabs.map(c => `
        <a href="${c.link || 'index.html'}" target="_blank" style="display:inline-flex;align-items:center;gap:10px;padding:12px 24px;background:#fff;border:1px solid var(--line);border-radius:14px;white-space:nowrap;font-weight:800;font-size:12px;color:#111">
          <img src="${c.logo}" style="width:32px;height:32px;object-fit:contain">
          <span>${esc(c.name)}</span>
        </a>
      `).join("");
    }
  } catch(e) {}
}

// SHOP FILTERING & DYNAMIC PAGINATION
let currentPage = 1;
const itemsPerPage = 16;

function shopInit() {
  const grid = $("#shopGrid");
  if (!grid) return;

  const qs = new URLSearchParams(location.search);
  const searchInput = $("#searchFilter");
  const catSelect = $("#catFilter");
  const scaleSelect = $("#scaleFilter");
  const priceSelect = $("#priceFilter");
  const sortSelect = $("#sortFilter");

  if (catSelect && catSelect.options.length <= 1) {
    const cats = ["All Categories", "Racing Cars", "Drift Cars", "Monster Trucks", "Off Road Crawlers", "Buggies & Truggies", "Mini RC", "Collectables"];
    catSelect.innerHTML = cats.map(c => `<option value="${c === 'All Categories' ? '' : c}">${c}</option>`).join("");
  }
  if (catSelect && qs.get("cat")) catSelect.value = qs.get("cat");

  if (scaleSelect && scaleSelect.options.length <= 1) {
    const scales = ["All Scales", "1:7", "1:8", "1:10", "1:12", "1:14", "1:16", "1:24", "1:32", "1:64"];
    scaleSelect.innerHTML = scales.map(s => `<option value="${s === 'All Scales' ? '' : s}">${s === 'All Scales' ? 'All Scales' : s + ' Scale'}</option>`).join("");
  }
  if (scaleSelect && qs.get("scale")) scaleSelect.value = qs.get("scale");

  if (searchInput && qs.get("q")) searchInput.value = qs.get("q");

  function render() {
    let a = [...getProducts()];

    const q = (searchInput?.value || "").toLowerCase().trim();
    if (q) a = a.filter(p => (p.name + " " + p.sku + " " + p.category + " " + (p.scale || '')).toLowerCase().includes(q));

    const cat = catSelect?.value || "";
    if (cat) a = a.filter(p => p.category === cat);

    const scale = scaleSelect?.value || "";
    if (scale) a = a.filter(p => p.scale === scale);

    const maxPrice = Number(priceSelect?.value || 0);
    if (maxPrice > 0) a = a.filter(p => p.price <= maxPrice);

    const sort = sortSelect?.value || "";
    if (sort === "low") a.sort((x, y) => x.price - y.price);
    else if (sort === "high") a.sort((x, y) => y.price - x.price);
    else if (sort === "discount") a.sort((x, y) => (y.discount || 0) - (x.discount || 0));

    if ($("#resultCount")) $("#resultCount").textContent = `${a.length} Products Found`;
    if ($("#shopCount")) $("#shopCount").textContent = `${a.length} Products Found`;

    const totalPages = Math.max(1, Math.ceil(a.length / itemsPerPage));
    if (currentPage > totalPages) currentPage = 1;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const pageProducts = a.slice(startIdx, startIdx + itemsPerPage);

    if (!pageProducts.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1;text-align:center;padding:48px;color:#888">No matching models found. Try clearing filters.</div>';
    } else {
      grid.innerHTML = pageProducts.map(productCard).join("");
    }

    const pager = $("#pager");
    if (pager) {
      if (totalPages <= 1) {
        pager.innerHTML = "";
      } else {
        let pagerHTML = "";
        if (currentPage > 1) {
          pagerHTML += `<button class="pill" onclick="goToShopPage(${currentPage - 1})">‹ Prev</button>`;
        }
        for (let i = 1; i <= totalPages; i++) {
          pagerHTML += `<button class="pill ${i === currentPage ? 'active' : ''}" onclick="goToShopPage(${i})">${i}</button>`;
        }
        if (currentPage < totalPages) {
          pagerHTML += `<button class="pill" onclick="goToShopPage(${currentPage + 1})">Next ›</button>`;
        }
        pager.innerHTML = pagerHTML;
      }
    }
  }

  window.goToShopPage = function(pNum) {
    currentPage = pNum;
    render();
    window.scrollTo({ top: grid.offsetTop - 120, behavior: 'smooth' });
  };

  [searchInput, catSelect, scaleSelect, priceSelect, sortSelect].forEach(el => {
    if (el) el.addEventListener("change", () => { currentPage = 1; render(); });
    if (el && el.tagName === "INPUT") el.addEventListener("input", () => { currentPage = 1; render(); });
  });

  render();
}

function homeInit() {
  const root = $("#homeProducts");
  if (!root) return;
  function show(cat = "All") {
    let a = getProducts().filter(p => p.image && p.category !== "Collectables");
    if (cat !== "All") a = a.filter(p => p.category === cat);
    a = a.sort((x, y) => (y.featured - x.featured) || (y.discount - x.discount)).slice(0, 8);
    root.innerHTML = a.map(productCard).join("");
  }
  show();
  $$("[data-home-filter]").forEach(b => b.onclick = () => {
    $$("[data-home-filter]").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    show(b.dataset.homeFilter);
  });
}

function productInit() {
  const root = $("#productDetail");
  if (!root) return;

  const qs = new URLSearchParams(location.search);
  const id = Number(qs.get("id")) || 71;
  const productsList = getProducts();
  const p = productsList.find(x => x.id === id) || productsList[0];

  if (!p) {
    root.innerHTML = '<div class="empty">Product not found.</div>';
    return;
  }

  document.title = `${p.name} — HyperXGT`;

  const w = getWish().includes(p.id);
  const stock = p.stock !== undefined ? p.stock : 25;

  const imagesList = parseImagesArray(p);
  const heroImage = p.image || imagesList[0];

  const galleryThumbnailsHTML = imagesList.map((img, idx) => {
    const isHero = img.trim() === heroImage.trim() || idx === 0;
    return `
      <img class="mini-thumb" src="${img.trim()}" alt="Angle ${idx + 1}" onclick="switchHeroImage('${img.trim()}', this)" style="width:72px;height:58px;object-fit:contain;background:#fff;border-radius:10px;border:${isHero ? '2.5px solid #1488d8' : '1px solid var(--line)'};padding:4px;cursor:pointer;transition:all 0.2s ease">
    `;
  }).join("");

  let stockStatusHTML = `<div style="margin: 14px 0 20px; font-size: 12px; color: #2e7d32; font-weight: 700; display: flex; align-items: center; gap: 6px;">
    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2e7d32"></span>
    🟢 In Stock — <strong>${stock} Units Available</strong> for Express Dispatch (Ships within 24 Hours)
  </div>`;
  let buyDetailBtn = `<button class="btn dark" style="flex:1" onclick="addCart(${p.id}, $('#detailQty').value)">Add to Cart 🛒</button>`;

  if (stock === 0) {
    stockStatusHTML = `<div style="margin: 14px 0 20px; font-size: 12px; color: #ed1c24; font-weight: 700; display: flex; align-items: center; gap: 6px;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ed1c24"></span>
      🔴 Currently Out of Stock (Sold Out)
    </div>`;
    buyDetailBtn = `<button class="btn dark" style="flex:1;background:#888;cursor:not-allowed" disabled>Out of Stock 🚫</button>`;
  } else if (stock <= 5) {
    stockStatusHTML = `<div style="margin: 14px 0 20px; font-size: 12px; color: #b78103; font-weight: 700; display: flex; align-items: center; gap: 6px;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#b78103"></span>
      🟡 Low Stock Alert — <strong>Only ${stock} Units Remaining!</strong> Order soon.
    </div>`;
  }

  root.innerHTML = `
    <div class="detail-media-wrap">
      <div class="detail-media" style="background:#f6f8fc;border-radius:18px;padding:24px;text-align:center;border:1px solid #e0e6f8">
        <img id="mainProdImg" src="${heroImage}" alt="${esc(p.name)}" style="max-width:100%;height:340px;object-fit:contain;transition:all 0.3s ease">
      </div>
      ${imagesList.length > 1 ? `
      <div style="display:flex;gap:10px;margin-top:14px;overflow-x:auto;padding-bottom:6px">
        ${galleryThumbnailsHTML}
      </div>` : ''}
    </div>
    <div class="detail-info">
      <div class="eyebrow"><a href="shop.html?cat=${encodeURIComponent(p.category)}" style="color:inherit">${esc(p.category)}</a> · SKU: <strong>${esc(p.sku)}</strong></div>
      <h1>${esc(p.name)}</h1>
      
      <div class="detail-price">
        <strong>${INR(p.price)}</strong>
        ${p.mrp > p.price ? `<del>${INR(p.mrp)}</del>` : ""}
        ${p.discount ? `<span style="font-size:12px;color:#ed1c24;font-weight:900;background:#ffeeef;padding:3px 9px;border-radius:6px;margin-left:8px">${p.discount}% OFF</span>` : ""}
      </div>

      ${stockStatusHTML}

      <div style="color:#5f6471; font-size: 13.5px; line-height: 1.6; margin-bottom: 20px;">
        ${p.short_description || `Official HyperXGT ${esc(p.scale)} ${esc(p.category)} model.`}
      </div>

      <div class="modal-row" style="align-items: center; margin-bottom: 24px;">
        <div style="display:flex;align-items:center;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff">
          <button style="width:34px;height:42px;border:0;background:none;font-weight:900;cursor:pointer" onclick="const i=$('#detailQty'); i.value=Math.max(1, Number(i.value)-1)">-</button>
          <input id="detailQty" style="width:48px;height:42px;border:0;text-align:center;font-weight:900;margin:0" type="number" min="1" max="${stock}" value="1">
          <button style="width:34px;height:42px;border:0;background:none;font-weight:900;cursor:pointer" onclick="const i=$('#detailQty'); i.value=Math.min(${stock}, Number(i.value)+1)">+</button>
        </div>
        ${buyDetailBtn}
        <button class="btn" style="width:48px;padding:0;display:grid;place-items:center" onclick="toggleWish(${p.id})">${w ? "♥" : "♡"}</button>
      </div>

      <div style="border-top:1px solid var(--line); padding-top:20px; margin-top:20px">
        <h4 style="font-size:11px; text-transform:uppercase; letter-spacing:0.1em; color:#90949b; margin-bottom:12px">Complete Technical Specifications</h4>
        <div class="spec-table">${renderFullSpecGrid(p)}</div>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  initChrome();
  homeInit();
  shopInit();
  productInit();
  renderCategoryCarousels();
  renderCollaborationsRail();
  fetchLiveBackendProducts();
});
