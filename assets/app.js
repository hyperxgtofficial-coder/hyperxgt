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

// DYNAMIC GLOBAL MODALS & DRAWERS INJECTOR
function ensureGlobalModalsAndDrawers() {
  if (!$("#mobileDrawer")) {
    const div = document.createElement("div");
    div.className = "drawer";
    div.id = "mobileDrawer";
    div.innerHTML = `
      <div class="shade"></div>
      <div class="drawer-panel" style="width:min(360px,88vw)">
        <div class="drawer-head">
          <div><b style="color:#ed1c24;font-size:16px">HYPERXGT</b> <span style="font-size:10px;color:#888">Store Menu</span></div>
          <button class="x">×</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px;padding:24px 0">
          <a href="why.html" style="font-size:15px;font-weight:900;color:#111;padding:10px 0;border-bottom:1px solid #eee">Why HyperXGT</a>
          <a href="shop.html" style="font-size:15px;font-weight:900;color:#111;padding:10px 0;border-bottom:1px solid #eee">Shop Catalogue (338 Rigs)</a>
          <a href="upgrades.html" style="font-size:15px;font-weight:900;color:#111;padding:10px 0;border-bottom:1px solid #eee">Upgrades & Parts</a>
          <a href="club.html" style="font-size:15px;font-weight:900;color:#111;padding:10px 0;border-bottom:1px solid #eee">Join HyperXGT Club</a>
          <a href="contact.html" style="font-size:15px;font-weight:900;color:#111;padding:10px 0;border-bottom:1px solid #eee">Care & Support</a>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">
            <button class="btn blue" onclick="closeEl(this); openModal('trackModal')">⌖ Track Order</button>
            <button class="btn dark" onclick="closeEl(this); openModal('accountModal')">♙ My Garage</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
  }

  if (!$("#trackModal")) {
    const div = document.createElement("div");
    div.className = "modal";
    div.id = "trackModal";
    div.innerHTML = `
      <div class="shade"></div>
      <div class="modal-box">
        <div class="drawer-head"><b>Track My Order</b><button class="x">×</button></div>
        <h3 style="font-size:22px;margin:12px 0 16px">Where is my RC?</h3>
        <input class="field" id="trackOrder" placeholder="Order number, e.g. HX-10482">
        <div class="modal-row"><button class="btn blue" id="trackBtn">Track shipment</button></div>
        <div id="trackResult"></div>
      </div>
    `;
    document.body.appendChild(div);
  }

  if (!$("#searchModal")) {
    const div = document.createElement("div");
    div.className = "modal";
    div.id = "searchModal";
    div.innerHTML = `
      <div class="shade"></div>
      <div class="modal-box">
        <div class="drawer-head"><b>Search HyperXGT</b><button class="x">×</button></div>
        <h3 style="font-size:22px;margin:12px 0 16px">What are you looking for?</h3>
        <input class="field" id="searchField" placeholder="Search SKU, 4WD, 1:14, brushless, drift...">
        <div id="searchResults" style="font-size:11px;color:#666;margin-top:10px">Try: drift, racing, off road, 1:14</div>
      </div>
    `;
    document.body.appendChild(div);
  }

  if (!$("#accountModal")) {
    const div = document.createElement("div");
    div.className = "modal";
    div.id = "accountModal";
    div.innerHTML = `
      <div class="shade"></div>
      <div class="modal-box">
        <div class="drawer-head"><b>Customer Account</b><button class="x">×</button></div>
        <h3 style="font-size:22px;margin:12px 0 16px">Welcome to My Garage</h3>
        <input class="field" placeholder="Email or mobile number">
        <input class="field" type="password" placeholder="Password">
        <div class="modal-row" style="margin-top:14px">
          <button class="btn dark" onclick="toast('Signed in to My Garage ✓'); closeEl(this)">Sign in</button>
          <button class="btn" onclick="toast('Account created ✓'); closeEl(this)">Create account</button>
        </div>
      </div>
    `;
    document.body.appendChild(div);
  }

  if (!$("#cartDrawer")) {
    const div = document.createElement("div");
    div.className = "drawer";
    div.id = "cartDrawer";
    div.innerHTML = `
      <div class="shade"></div>
      <div class="drawer-panel">
        <div class="drawer-head">
          <div><b>Your Cart</b><div style="font-size:10px;color:#888">HyperXGT Store</div></div>
          <button class="x">×</button>
        </div>
        <div id="cartItems" class="cart-empty">Your cart is empty.</div>
        <div id="cartSummary" style="display:none;margin-top:22px">
          <a class="btn dark" style="width:100%;display:flex;align-items:center;justify-content:center" href="checkout.html">Proceed to secure checkout</a>
        </div>
      </div>
    `;
    document.body.appendChild(div);
  }
}

function initChrome() {
  ensureGlobalModalsAndDrawers();
  updateCount();
  renderCartDrawer();

  // BIND ALL ACTION BUTTONS & MODALS
  $$("[data-modal]").forEach(b => {
    b.onclick = (e) => {
      e.preventDefault();
      openModal(b.dataset.modal);
    };
  });

  // Track Icon Button (⌖)
  $$(".trackIcon").forEach(b => {
    b.onclick = (e) => {
      e.preventDefault();
      openModal("trackModal");
    };
  });

  // Mobile Menu ☰ (#mobileOpen)
  const mobBtn = $("#mobileOpen");
  if (mobBtn) {
    mobBtn.onclick = (e) => {
      e.preventDefault();
      openModal("mobileDrawer");
    };
  }

  // Cart Open 🛒 (#cartOpen)
  const cartBtn = $("#cartOpen");
  if (cartBtn) {
    cartBtn.onclick = (e) => {
      e.preventDefault();
      renderCartDrawer();
      openModal("cartDrawer");
    };
  }

  // Search Input live filtering in modal
  const searchInput = $("#searchField");
  if (searchInput) {
    searchInput.oninput = function() {
      const q = searchInput.value.toLowerCase().trim();
      const resultsDiv = $("#searchResults");
      if (!resultsDiv) return;
      if (!q) {
        resultsDiv.innerHTML = 'Try: drift, racing, off road, 1:14';
        return;
      }
      const matches = getProducts().filter(p => (p.name + " " + p.sku + " " + p.category).toLowerCase().includes(q)).slice(0, 5);
      if (!matches.length) {
        resultsDiv.innerHTML = '<div style="color:#999;padding:10px 0">No matching models found.</div>';
      } else {
        resultsDiv.innerHTML = matches.map(p => `
          <a href="product.html?id=${p.id}" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #eee">
            <img src="${p.image}" style="width:36px;height:30px;object-fit:contain">
            <div>
              <strong style="color:#111;font-size:12px">${esc(p.name)}</strong>
              <div style="font-size:10px;color:#1488d8">${esc(p.sku)} · ${INR(p.price)}</div>
            </div>
          </a>
        `).join("");
      }
    };
  }

  // Track AWB Order Handler
  const tb = $("#trackBtn");
  if (tb) {
    tb.onclick = async () => {
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

  // Global Close Click Delegate
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("shade") || e.target.classList.contains("x")) {
      const parent = e.target.closest(".modal,.drawer");
      if (parent) parent.classList.remove("open");
    }
  });
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

// IN-DEPTH YOUCLIQ-INSPIRED RICH & KNOWLEDGEABLE PRODUCT PAGE RENDERER
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
  const savings = Math.max(0, (p.mrp || 0) - (p.price || 0));

  const imagesList = parseImagesArray(p);
  const heroImage = p.image || imagesList[0];

  const galleryThumbnailsHTML = imagesList.map((img, idx) => {
    const isHero = img.trim() === heroImage.trim() || idx === 0;
    return `
      <img class="mini-thumb" src="${img.trim()}" alt="Angle ${idx + 1}" onclick="switchHeroImage('${img.trim()}', this)" style="width:76px;height:62px;object-fit:contain;background:#fff;border-radius:12px;border:${isHero ? '2.5px solid #1488d8' : '1px solid var(--line)'};padding:4px;cursor:pointer;transition:all 0.2s ease">
    `;
  }).join("");

  let stockStatusHTML = `<div style="margin: 14px 0 16px; font-size: 12px; color: #2e7d32; font-weight: 700; display: flex; align-items: center; gap: 6px;">
    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2e7d32"></span>
    🟢 In Stock — <strong>${stock} Units Available</strong> for Express Dispatch (Ships within 24 Hours)
  </div>`;
  let buyDetailBtn = `<button class="btn dark" style="flex:1;height:52px;font-size:14px" onclick="addCart(${p.id}, $('#detailQty').value)">Add to Cart 🛒</button>`;

  if (stock === 0) {
    stockStatusHTML = `<div style="margin: 14px 0 16px; font-size: 12px; color: #ed1c24; font-weight: 700; display: flex; align-items: center; gap: 6px;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ed1c24"></span>
      🔴 Currently Out of Stock (Sold Out)
    </div>`;
    buyDetailBtn = `<button class="btn dark" style="flex:1;height:52px;font-size:14px;background:#888;cursor:not-allowed" disabled>Out of Stock 🚫</button>`;
  } else if (stock <= 5) {
    stockStatusHTML = `<div style="margin: 14px 0 16px; font-size: 12px; color: #b78103; font-weight: 700; display: flex; align-items: center; gap: 6px;">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#b78103"></span>
      🟡 Low Stock Alert — <strong>Only ${stock} Units Remaining!</strong> Order soon.
    </div>`;
  }

  let videoPlayerHTML = "";
  if (p.video && p.video.trim()) {
    const vUrl = p.video.trim();
    let iframeSrc = "";
    
    if (vUrl.includes("youtube.com/watch?v=")) {
      const vId = vUrl.split("v=")[1]?.split("&")[0];
      iframeSrc = `https://www.youtube.com/embed/${vId}?autoplay=0&rel=0`;
    } else if (vUrl.includes("youtu.be/")) {
      const vId = vUrl.split("youtu.be/")[1]?.split("?")[0];
      iframeSrc = `https://www.youtube.com/embed/${vId}?autoplay=0&rel=0`;
    }

    if (iframeSrc) {
      videoPlayerHTML = `
        <div style="margin-top:24px;background:#000;border-radius:18px;overflow:hidden;box-shadow:var(--shadow)">
          <div style="background:#111;padding:10px 16px;color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;gap:8px">
            <span>🎥 Live Action Product Video</span>
          </div>
          <div style="position:relative;padding-bottom:56.25%;height:0">
            <iframe src="${iframeSrc}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen></iframe>
          </div>
        </div>
      `;
    } else {
      videoPlayerHTML = `
        <div style="margin-top:24px;background:#000;border-radius:18px;overflow:hidden;box-shadow:var(--shadow)">
          <div style="background:#111;padding:10px 16px;color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;gap:8px">
            <span>🎥 Live Action Product Video</span>
          </div>
          <video controls controlsList="nodownload" preload="metadata" style="width:100%;max-height:360px;background:#000;display:block" src="${vUrl}">
            Your browser does not support video playback.
          </video>
        </div>
      `;
    }
  }

  // Full Rich YouCliq-Style Product Page HTML
  root.innerHTML = `
    <div style="grid-column:1/-1;display:grid;grid-template-columns:1.05fr .95fr;gap:44px" id="productMainSection">
      
      <!-- LEFT: IMAGE GALLERY & THUMBNAILS -->
      <div class="detail-media-wrap">
        <div class="detail-media" style="background:#fff;border-radius:22px;padding:28px;text-align:center;border:1px solid var(--line);box-shadow:var(--shadow)">
          <img id="mainProdImg" src="${heroImage}" alt="${esc(p.name)}" style="max-width:100%;height:380px;object-fit:contain;transition:all 0.3s ease">
        </div>
        ${imagesList.length > 1 ? `
        <div style="display:flex;gap:10px;margin-top:16px;overflow-x:auto;padding-bottom:6px">
          ${galleryThumbnailsHTML}
        </div>` : ''}

        <!-- 4 TRUST BADGES ROW (YOUCLIQ REFERENCE) -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px">
          <div style="background:#f8f9fa;border:1px solid var(--line);border-radius:14px;padding:14px;font-size:11px">
            <strong style="color:#1488d8;display:block;margin-bottom:4px">🛡️ Refund & Return Policy</strong>
            <span style="color:#666">7-Day Guarantee · Unboxing video mandatory</span>
          </div>
          <div style="background:#f8f9fa;border:1px solid var(--line);border-radius:14px;padding:14px;font-size:11px">
            <strong style="color:#2e7d32;display:block;margin-top:0;margin-bottom:4px">💳 Partial COD & Gateway</strong>
            <span style="color:#666">Pay advance, balance on delivery / Razorpay</span>
          </div>
          <div style="background:#f8f9fa;border:1px solid var(--line);border-radius:14px;padding:14px;font-size:11px">
            <strong style="color:#e65100;display:block;margin-bottom:4px">🚚 Fast & Reliable Express</strong>
            <span style="color:#666">Shiprocket, Bluedart, Delhivery AWB</span>
          </div>
          <div style="background:#f8f9fa;border:1px solid var(--line);border-radius:14px;padding:14px;font-size:11px">
            <strong style="color:#7b2cbf;display:block;margin-bottom:4px">🔒 Guaranteed Safe Checkout</strong>
            <span style="color:#666">256-bit PCI-DSS SSL Encryption</span>
          </div>
        </div>

        ${videoPlayerHTML}
      </div>


      <!-- RIGHT: PURCHASING & PRODUCT HIGHLIGHTS -->
      <div class="detail-info">
        <div class="eyebrow"><a href="shop.html?cat=${encodeURIComponent(p.category)}" style="color:inherit">${esc(p.category)}</a> · SKU: <strong>${esc(p.sku)}</strong></div>
        <h1 style="font-size:32px;line-height:1.25;margin:10px 0;color:#111">${esc(p.name)}</h1>
        
        <div class="detail-price" style="display:flex;align-items:center;gap:12px;margin:14px 0">
          <strong style="font-size:32px;color:#111">${INR(p.price)}</strong>
          ${p.mrp > p.price ? `<del style="font-size:16px;color:#888">${INR(p.mrp)}</del>` : ""}
          ${savings > 0 ? `<span style="font-size:12px;color:#ed1c24;font-weight:900;background:#ffeeef;padding:4px 10px;border-radius:8px">🎉 You save ${INR(savings)} (${p.discount}% OFF)</span>` : ""}
        </div>

        ${stockStatusHTML}

        <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:12px;padding:12px 16px;font-size:12px;color:#855d00;font-weight:700;margin-bottom:20px">
          ⚡ Low Stock. Secure yours before the next factory restock batch.
        </div>

        <div style="color:#444; font-size: 14px; line-height: 1.7; margin-bottom: 24px; background:#f9fafb; padding:18px; border-radius:14px; border:1px solid #eaedf2">
          ${p.short_description || `The official HyperXGT ${esc(p.scale)} ${esc(p.category)} is a high-performance RC platform engineered for enthusiasts who demand extreme speed, rock-crawling torque, and scale realism.`}
        </div>

        <div class="modal-row" style="align-items: center; margin-bottom: 24px;">
          <div style="display:flex;align-items:center;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff">
            <button style="width:38px;height:52px;border:0;background:none;font-weight:900;cursor:pointer;font-size:16px" onclick="const i=$('#detailQty'); i.value=Math.max(1, Number(i.value)-1)">-</button>
            <input id="detailQty" style="width:52px;height:52px;border:0;text-align:center;font-weight:900;margin:0;font-size:15px" type="number" min="1" max="${stock}" value="1">
            <button style="width:38px;height:52px;border:0;background:none;font-weight:900;cursor:pointer;font-size:16px" onclick="const i=$('#detailQty'); i.value=Math.min(${stock}, Number(i.value)+1)">+</button>
          </div>
          ${buyDetailBtn}
          <button class="btn" style="width:52px;height:52px;padding:0;display:grid;place-items:center;font-size:20px" onclick="toggleWish(${p.id})">${w ? "♥" : "♡"}</button>
        </div>

        <!-- WHATSAPP FAST ORDER BUTTON -->
        <a href="https://wa.me/917090227777?text=${encodeURIComponent('Hi HyperXGT, I want to inquire about purchasing: ' + p.name + ' (SKU: ' + p.sku + ')')}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:10px;background:#25d366;color:#fff;border-radius:12px;height:46px;font-weight:900;font-size:13px;margin-bottom:28px">
          <span>💬 Inquire or Order via WhatsApp (+91 70902 27777)</span>
        </a>
      </div>
    </div>

    <!-- IN-DEPTH YOUCLIQ-STYLE TECHNICAL DESCRIPTION & SPECIFICATIONS SECTION -->
    <div style="grid-column:1/-1;margin-top:60px;border-top:1px solid var(--line);padding-top:48px">
      
      <div style="display:grid;grid-template-columns:1.2fr .8fr;gap:40px">
        
        <!-- DETAILED NARRATIVE DESCRIPTION (YOUCLIQ REFERENCE) -->
        <div>
          <div class="eyebrow" style="color:#1488d8">In-Depth Vehicle Overview</div>
          <h2 style="font-size:28px;margin:8px 0 20px;color:#111">Engineered for Technical Mastery</h2>
          
          <div style="font-size:14px;line-height:1.8;color:#333">
            <p>${esc(p.full_description || p.short_description || `The HyperXGT ${p.name} combines advanced RC technology with heavy-duty structural chassis design. Built for hobbyists who demand durability, scale precision, and raw performance across all terrains.`)}</p>

            <h3 style="font-size:18px;margin-top:24px;color:#111">⚡ Drivetrain & Motor Performance</h3>
            <p>Powered by a high-torque <strong>${esc(p.motor || 'Brushless Performance Motor')}</strong> and <strong>${esc(p.drive || '4WD')} Drive System</strong>, this model produces instantaneous power delivery. The engineered drivetrain features hardened metal differential gears to withstand heavy bashing, high-speed speed runs, and steep incline rock climbing.</p>

            <h3 style="font-size:18px;margin-top:24px;color:#111">🕹️ 2.4GHz Anti-Interference Radio Control</h3>
            <p>Equipped with a 2.4GHz pro-proportional transmitter system offering an operating range of up to 120+ meters. Enjoy smooth, responsive throttle modulation and pinpoint steering control without signal overlap when driving alongside multiple RC vehicles.</p>

            <h3 style="font-size:18px;margin-top:24px;color:#111">🛡️ All-Terrain Suspension & Chassis Articulation</h3>
            <p>Independent oil-filled shock absorbers and long-travel suspension arms absorb bumps on rough dirt tracks, rocky trails, and high-impact jumps while preserving chassis balance and ground clearance.</p>
          </div>

          <!-- KEY HIGHLIGHT BULLETS LIST -->
          <div style="margin-top:32px;background:#f8f9fa;border:1px solid var(--line);border-radius:18px;padding:28px">
            <h3 style="font-size:18px;margin-top:0;margin-bottom:16px;color:#111">✨ Key Performance Highlights</h3>
            <ul style="margin:0;padding-left:20px;font-size:13.5px;line-height:2;color:#333">
              <li>Official Scale: <strong>${esc(p.scale || '1:16')} Scale</strong> High-Detail Rig</li>
              <li>Top Speed Rating: <strong>${esc(p.speed || '35+ KM/H')}</strong></li>
              <li>Drivetrain: <strong>${esc(p.drive || '4WD Full-Time 4-Wheel Drive')}</strong></li>
              <li>Motor Spec: <strong>${esc(p.motor || 'Electric Motor System')}</strong></li>
              <li>Battery Spec: <strong>${esc(p.battery || 'Rechargeable Battery Pack')}</strong></li>
              <li>Chassis: Heavy-Duty Reinforced Composite & Alloy Shock Towers</li>
              <li>Express Dispatch: 24-Hour Dispatch from Domestic Warehouses across India</li>
            </ul>
          </div>
        </div>

        <!-- RIGHT SIDEBAR: SPEC TABLE + WHAT'S IN THE BOX -->
        <div>
          <!-- TECHNICAL SPECIFICATIONS TABLE -->
          <div style="background:#fff;border:1px solid var(--line);border-radius:20px;padding:28px;box-shadow:var(--shadow)">
            <h3 style="font-size:18px;margin-top:0;margin-bottom:16px;color:#111">📋 Full Technical Specs</h3>
            <div class="spec-table">${renderFullSpecGrid(p)}</div>
          </div>

          <!-- WHAT'S IN THE BOX & WHAT IS REQUIRED (YOUCLIQ REFERENCE) -->
          <div style="margin-top:24px;background:#fff;border:1px solid #1488d8;border-radius:20px;padding:28px">
            <h3 style="font-size:18px;margin-top:0;color:#1488d8;margin-bottom:14px">📦 Package Contents</h3>
            <ul style="margin:0 0 20px;padding-left:18px;font-size:13px;line-height:1.8;color:#444">
              <li>1 × ${esc(p.name)} Model Vehicle</li>
              <li>1 × 2.4GHz Proportional Remote Controller</li>
              <li>1 × Rechargeable Li-ion/LiPo Battery Pack</li>
              <li>1 × USB High-Speed Charging Cable</li>
              <li>1 × Wheel Wrench & Maintenance Tool Kit</li>
              <li>1 × Official Instruction Manual</li>
            </ul>

            <div style="border-top:1px solid #e0e8f5;padding-top:16px">
              <strong style="color:#ed1c24;font-size:13px;display:block;margin-bottom:6px">⚠️ Required for Operation:</strong>
              <span style="font-size:12px;color:#666;line-height:1.5;display:block">AA Transmitter Batteries (3 or 4 × AA) for remote controller.</span>
            </div>
          </div>

          <!-- WHY BUY THIS HYPERXGT MODEL SUMMARY -->
          <div style="margin-top:24px;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:20px;padding:24px">
            <h3 style="font-size:16px;margin-top:0;color:#2e7d32;margin-bottom:8px">🏆 Why Buy This Model?</h3>
            <p style="font-size:12px;color:#1b5e20;line-height:1.6;margin:0">HyperXGT models are engineered for genuine hobbyists. Backed by full domestic spare parts inventory, express 24-hour dispatch across India, and our 7-Day Replacement Guarantee.</p>
          </div>
        </div>

      </div>

      <!-- CUSTOMER REVIEWS & UNBOXING COUPON SUBMISSION SECTION -->
      <div style="margin-top:60px;background:#fff;border:1px solid var(--line);border-radius:24px;padding:40px;box-shadow:var(--shadow)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
          <div>
            <div class="eyebrow" style="color:#2e7d32">Customer Reviews & Unboxing Content</div>
            <h2 style="font-size:26px;margin:4px 0 0;color:#111">Driver Feedback & Testimonials</h2>
          </div>
          <button class="btn blue" onclick="openModal('reviewModal')">⭐ Submit Review & Get 10% OFF Coupon</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
          <div style="background:#f8f9fa;border:1px solid var(--line);border-radius:16px;padding:20px">
            <div style="color:#b78103;font-weight:900;font-size:14px;margin-bottom:6px">⭐⭐⭐⭐⭐ 5/5 Stars</div>
            <p style="font-size:12px;color:#444;line-height:1.6;margin:0 0 10px">"Incredible speed and build quality! Shipped fast via Bluedart and arrived in perfect condition. The metal gears make a huge difference."</p>
            <strong style="font-size:11px;color:#111">Vikram S. — Verified Buyer</strong>
          </div>

          <div style="background:#f8f9fa;border:1px solid var(--line);border-radius:16px;padding:20px">
            <div style="color:#b78103;font-weight:900;font-size:14px;margin-bottom:6px">⭐⭐⭐⭐⭐ 5/5 Stars</div>
            <p style="font-size:12px;color:#444;line-height:1.6;margin:0 0 10px">"Bought the Citroen WRC Rally model. Throttle control is super smooth and low-speed crawling torque is awesome."</p>
            <strong style="font-size:11px;color:#111">Amit K. — Verified Driver</strong>
          </div>

          <div style="background:#f8f9fa;border:1px solid var(--line);border-radius:16px;padding:20px">
            <div style="color:#b78103;font-weight:900;font-size:14px;margin-bottom:6px">⭐⭐⭐⭐⭐ 5/5 Stars</div>
            <p style="font-size:12px;color:#444;line-height:1.6;margin:0 0 10px">"Submitted my unboxing video and received my 10% discount coupon in 2 hours. Best RC customer service in India!"</p>
            <strong style="font-size:11px;color:#111">Rajesh P. — Club Member</strong>
          </div>
        </div>
      </div>

    </div>
  `;

  // RENDER SIMILAR VARIANTS CATALOGUE RECOMMENDATIONS GRID
  renderRelatedProducts(p);
}

function renderRelatedProducts(currentProduct) {
  const grid = $("#relatedGrid");
  if (!grid) return;

  const all = getProducts();
  let related = all.filter(x => x.id !== currentProduct.id && x.category === currentProduct.category);
  
  if (related.length < 4) {
    const sameScale = all.filter(x => x.id !== currentProduct.id && x.scale === currentProduct.scale && !related.includes(x));
    related = [...related, ...sameScale];
  }

  if (related.length < 4) {
    const remaining = all.filter(x => x.id !== currentProduct.id && !related.includes(x));
    related = [...related, ...remaining];
  }

  const top4 = related.slice(0, 4);
  if (!top4.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1;text-align:center;padding:24px;color:#888">No related variants found.</div>';
  } else {
    grid.innerHTML = top4.map(productCard).join("");
  }
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
