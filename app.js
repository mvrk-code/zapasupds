/* ══════════════════════════════════════════
   C-SHARKS — featured view, web shop, and cart
══════════════════════════════════════════ */

const $ = (selector) => document.querySelector(selector);
const money = (value) => `$${value.toFixed(2)}`;
const brands = ['ALL', 'NIKE', 'ADIDAS', 'NEW BALANCE', 'PUMA', 'CROCS'];
const state = { products: [], brand: 'ALL', selected: null, detailFrame: 0, size: null, quantity: 1, cart: [], promo: false, panel: null, lastFocus: null };
const imagePath = (product, index) => `imgstitch/${product.slug}${index + 1}.jpg`;
const imageLabel = (product, index) => `${product.brand} ${product.model}, view ${index + 1} of 3`;
const productById = (id) => state.products.find((product) => product.id === id);
const stockFor = (product, size) => !((size + state.products.indexOf(product)) % 7 === 0 || (size + state.products.indexOf(product)) % 11 === 0);

function readCart() {
  try {
    const stored = JSON.parse(localStorage.getItem('app_cart_v1') || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((item) => item && typeof item.productId === 'string' && Number.isInteger(item.size) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99).map(({ productId, size, quantity }) => ({ productId, size, quantity }));
  } catch { return []; }
}
function saveCart() { localStorage.setItem('app_cart_v1', JSON.stringify(state.cart)); }
function preload(urls) { urls.forEach((url) => { const img = new Image(); img.src = url; }); }
function preloadProduct(product) { preload([0, 1, 2].map((index) => imagePath(product, index))); }

function renderFilters() {
  $('#brand-filters').innerHTML = brands.map((brand) => `<button type="button" data-brand="${brand}" class="${state.brand === brand ? 'active' : ''}" aria-pressed="${state.brand === brand}">${brand}</button>`).join('');
}
function renderProducts() {
  const filtered = state.products.filter((product) => state.brand === 'ALL' || product.brand === state.brand);
  $('#product-grid').innerHTML = filtered.map((product) => `<article class="product-card" style="view-transition-name:product-${product.slug}" tabindex="0" role="button" aria-label="View ${product.brand} ${product.model}" data-product="${product.id}"><div class="product-image"><span class="product-index">NO. ${String(state.products.indexOf(product) + 1).padStart(3, '0')}</span><span class="product-arrow" aria-hidden="true">↗</span><img src="${imagePath(product, 0)}" alt="${product.brand} ${product.model}" loading="lazy"></div><div class="product-info"><div><span class="product-meta">${product.brand} / ${product.tag}</span><h3>${product.model}</h3></div><span class="product-price">${money(product.price)}</span></div></article>`).join('');
}
function setBrand(brand) {
  if (brand === state.brand) return;
  const render = () => { state.brand = brand; renderFilters(); renderProducts(); };
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(render);
  else render();
}

function openPanel(name) {
  if (state.panel === name) return;
  if (!state.panel) state.lastFocus = document.activeElement;
  state.panel = name;
  $('#overlay').hidden = false;
  document.body.style.overflow = 'hidden';
  $('main').inert = true;
  $('.site-header').inert = true;
  $('#cart-trigger').inert = true;
  for (const id of ['detail', 'cart']) {
    const panel = $(`#${id}-panel`);
    const active = id === name;
    panel.classList.toggle('open', active);
    panel.setAttribute('aria-hidden', String(!active));
    panel.inert = !active;
  }
  setTimeout(() => $(`#${name}-close`).focus(), 100);
}
function closePanel(updateHash = true) {
  if (!state.panel) return;
  const wasDetail = state.panel === 'detail';
  state.panel = null;
  $('#overlay').hidden = true;
  document.body.style.overflow = '';
  $('main').inert = false;
  $('.site-header').inert = false;
  $('#cart-trigger').inert = false;
  for (const id of ['detail', 'cart']) { const panel = $(`#${id}-panel`); panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); panel.inert = true; }
  if (wasDetail && updateHash && location.hash.startsWith('#product/')) history.replaceState(null, '', '#shop');
  if (state.lastFocus?.isConnected) state.lastFocus.focus();
}
function openProduct(id, updateHash = true) {
  const product = productById(id);
  if (!product) return;
  state.selected = product; state.detailFrame = 0; state.size = null; state.quantity = 1;
  renderDetail(); preloadProduct(product); openPanel('detail');
  if (updateHash) history.replaceState(null, '', `#product/${id}`);
}
function renderDetail() {
  const product = state.selected;
  if (!product) return;
  $('#detail-brand').textContent = `${product.brand} / ${product.tag}`;
  $('#detail-title').textContent = product.model;
  $('#detail-price').textContent = `${money(product.price)} USD`;
  $('#detail-description').textContent = product.description;
  $('#detail-image').src = imagePath(product, state.detailFrame);
  $('#detail-image').alt = imageLabel(product, state.detailFrame);
  $('#detail-thumbs').innerHTML = [0, 1, 2].map((index) => `<button type="button" data-frame="${index}" class="${index === state.detailFrame ? 'active' : ''}" aria-label="View image ${index + 1}" aria-pressed="${index === state.detailFrame}"><img src="${imagePath(product, index)}" alt=""></button>`).join('');
  $('#color-options').innerHTML = `<button type="button" class="active" style="background:${product.color.hex}" aria-label="${product.color.name}" aria-pressed="true" title="${product.color.name}"></button>`;
  $('#color-name').textContent = product.color.name.toUpperCase();
  $('#size-options').innerHTML = [38, 39, 40, 41, 42, 43, 44, 45].map((size) => `<button type="button" data-size="${size}" class="${state.size === size ? 'selected' : ''}" aria-pressed="${state.size === size}" ${stockFor(product, size) ? '' : 'disabled'}>${size}</button>`).join('');
  $('#size-status').textContent = state.size ? `EU ${state.size}` : 'SELECT ONE';
  $('#detail-quantity').textContent = state.quantity;
  $('#detail-minus').disabled = state.quantity === 1;
  $('#detail-plus').disabled = state.quantity === 99;
}
function setSize(size) { if (!stockFor(state.selected, size)) return; state.size = size; renderDetail(); }
function changeDetailQuantity(delta) { state.quantity = Math.max(1, Math.min(99, state.quantity + delta)); renderDetail(); }

function addToCart(buyNow = false) {
  if (!state.size) { $('#size-status').textContent = 'SELECT A SIZE FIRST'; $('#size-options').querySelector('button:not(:disabled)')?.focus(); toast('Select a size first.'); return; }
  const current = state.cart.find((item) => item.productId === state.selected.id && item.size === state.size);
  if (current) current.quantity = Math.min(99, current.quantity + state.quantity);
  else state.cart.push({ productId: state.selected.id, size: state.size, quantity: state.quantity });
  saveCart(); renderCart();
  const button = $('#add-to-cart');
  button.firstChild.textContent = 'ADDED TO CART ';
  setTimeout(() => { button.firstChild.textContent = 'ADD TO CART '; }, 1100);
  setTimeout(() => { history.replaceState(null, '', '#shop'); openPanel('cart'); if (buyNow) $('#checkout').focus(); }, 350);
}
function cartItems() { return state.cart.map((item) => ({ ...item, product: productById(item.productId) })).filter((item) => item.product); }
function renderCart() {
  const items = cartItems();
  const count = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const discount = state.promo ? subtotal * .1 : 0;
  $('#cart-count').textContent = count;
  $('#cart-heading-count').textContent = `(${count})`;
  $('#cart-items').innerHTML = items.length ? items.map((item) => `<div class="cart-item"><img src="${imagePath(item.product, 0)}" alt="${item.product.model}"><div class="cart-item-info"><h3>${item.product.model}</h3><p>${item.product.color.name} / EU ${item.size}</p><strong class="cart-item-price">${money(item.product.price * item.quantity)} USD</strong><div class="cart-item-bottom"><div class="cart-qty"><button type="button" data-cart-action="minus" data-id="${item.productId}" data-size="${item.size}" aria-label="Decrease ${item.product.model} quantity">−</button><span>${item.quantity}</span><button type="button" data-cart-action="plus" data-id="${item.productId}" data-size="${item.size}" aria-label="Increase ${item.product.model} quantity">+</button></div><button class="remove-item" type="button" data-cart-action="remove" data-id="${item.productId}" data-size="${item.size}">REMOVE</button></div></div></div>`).join('') : `<div class="cart-empty"><strong>NOTHING IN HERE YET.</strong><p>Find something that moves you.</p><button type="button" id="empty-shop">EXPLORE WEB SHOP ↗</button></div>`;
  $('#subtotal').textContent = money(subtotal);
  $('#discount').textContent = `−${money(discount)}`;
  $('#discount-line').hidden = !state.promo || !items.length;
  $('#total').textContent = money(subtotal - discount);
  $('#checkout').disabled = !items.length;
}
function changeCartItem(id, size, action) {
  const index = state.cart.findIndex((item) => item.productId === id && item.size === size);
  if (index < 0) return;
  if (action === 'remove') state.cart.splice(index, 1);
  else if (action === 'plus') state.cart[index].quantity = Math.min(99, state.cart[index].quantity + 1);
  else if (state.cart[index].quantity <= 1) state.cart.splice(index, 1);
  else state.cart[index].quantity -= 1;
  saveCart(); renderCart();
}
let toastTimer;
function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 3200); }
function showView(view) {
  const isShop = view === 'shop';
  const changed = $('#home').hidden !== isShop;
  document.body.dataset.view = view;
  $('#home').hidden = isShop;
  $('#shop').hidden = !isShop;
  $('footer').hidden = !isShop;
  $('[data-nav="home"]').setAttribute('aria-current', isShop ? 'false' : 'page');
  $('[data-nav="shop"]').setAttribute('aria-current', isShop ? 'page' : 'false');
  if (changed) window.scrollTo(0, 0);
}
function route() {
  const isProduct = location.hash.startsWith('#product/');
  const id = isProduct ? decodeURIComponent(location.hash.slice('#product/'.length)) : '';
  const product = isProduct ? productById(id) : null;
  if (state.panel === 'detail' && (!product || state.selected?.id !== id)) closePanel(false);
  showView(location.hash === '#shop' || product ? 'shop' : 'home');
  if (product && (state.panel !== 'detail' || state.selected?.id !== id)) openProduct(id, false);
}

async function init() {
  try {
    const response = await fetch('products.json');
    if (!response.ok) throw new Error(`Catalog response ${response.status}`);
    state.products = await response.json();
    state.cart = readCart();
    renderFilters(); renderProducts(); renderCart(); route();
  } catch (error) { console.error(error); $('#product-grid').innerHTML = '<p>THE WEB SHOP COULD NOT LOAD. PLEASE RELOAD THE PAGE.</p>'; }
}

/* ── Shop / Cart event listeners ───────────────────────────── */
$('#brand-filters').addEventListener('click', (event) => { const button = event.target.closest('[data-brand]'); if (button) setBrand(button.dataset.brand); });
$('#product-grid').addEventListener('click', (event) => { const card = event.target.closest('[data-product]'); if (card) openProduct(card.dataset.product); });
$('#product-grid').addEventListener('keydown', (event) => { const card = event.target.closest('[data-product]'); if (card && ['Enter', ' '].includes(event.key)) { event.preventDefault(); openProduct(card.dataset.product); } });
$('#detail-thumbs').addEventListener('click', (event) => { const button = event.target.closest('[data-frame]'); if (button) { state.detailFrame = Number(button.dataset.frame); renderDetail(); } });
$('#size-options').addEventListener('click', (event) => { const button = event.target.closest('[data-size]'); if (button) setSize(Number(button.dataset.size)); });
$('#detail-minus').addEventListener('click', () => changeDetailQuantity(-1));
$('#detail-plus').addEventListener('click', () => changeDetailQuantity(1));
$('#add-to-cart').addEventListener('click', () => addToCart(false));
$('#buy-now').addEventListener('click', () => addToCart(true));
$('#detail-close').addEventListener('click', () => closePanel());
$('#cart-close').addEventListener('click', () => closePanel());
$('#cart-trigger').addEventListener('click', () => { renderCart(); openPanel('cart'); });
$('#overlay').addEventListener('click', () => closePanel());
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closePanel();
  else if (event.key === 'Tab' && state.panel) {
    const focusable = [...$(`#${state.panel}-panel`).querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')].filter((node) => node.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
$('#cart-items').addEventListener('click', (event) => { const action = event.target.closest('[data-cart-action]'); if (action) changeCartItem(action.dataset.id, Number(action.dataset.size), action.dataset.cartAction); if (event.target.closest('#empty-shop')) { closePanel(); location.hash = '#shop'; } });
$('#promo-toggle').addEventListener('click', () => { const form = $('#promo-form'); form.hidden = !form.hidden; $('#promo-toggle').setAttribute('aria-expanded', String(!form.hidden)); if (!form.hidden) $('#promo-input').focus(); });
$('#promo-apply').addEventListener('click', () => { const code = $('#promo-input').value.trim().toUpperCase(); if (code === 'STITCH10') { state.promo = true; $('#promo-message').textContent = 'CODE APPLIED — 10% OFF'; renderCart(); } else { $('#promo-message').textContent = 'CODE NOT RECOGNIZED'; } });
$('#checkout').addEventListener('click', () => toast('Checkout is not connected yet. Your cart is saved in this browser.'));
window.addEventListener('hashchange', route);
showView(location.hash === '#shop' || location.hash.startsWith('#product/') ? 'shop' : 'home');
init();


/* The featured brands stay within the home view. */
(function initSlider() {
  const track = document.getElementById('slideTrack');
  const products = [...document.querySelectorAll('.stage-prod')];
  const dots = [...document.querySelectorAll('.counter-dots .dot')];
  const counter = document.getElementById('counterNum');
  const total = products.length;
  const darkUi = [false, true, false, true, true];
  let current = 0;

  function showSlide(index) {
    current = (index + total) % total;
    track.style.transform = `translate3d(${-current * 100}vw, 0, 0)`;
    products.forEach((product, i) => product.classList.toggle('active', i === current));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
    counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    document.body.dataset.darkUi = String(darkUi[current]);
  }

  document.getElementById('snav-prev').addEventListener('click', () => showSlide(current - 1));
  document.getElementById('snav-next').addEventListener('click', () => showSlide(current + 1));
  document.addEventListener('keydown', (event) => {
    if (state.panel || $('#home').hidden || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      showSlide(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });

  const stage = document.getElementById('slider-sticky');
  let touchStart = null;
  stage.addEventListener('touchstart', (event) => { touchStart = event.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (event) => {
    if (touchStart === null) return;
    const distance = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(distance) > 40) showSlide(current + (distance < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });

  showSlide(0);
  document.getElementById('slider-nav').classList.remove('snav-hidden');
})();
