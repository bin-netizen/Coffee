function addToCart(id, name, price) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const existingItem = cart.find(item => String(item.id) === String(id));

  if (existingItem) {
    existingItem.quantity = (Number(existingItem.quantity) || 1) + 1;
  } else {
    cart.push({ id, name, price: Number(price), quantity: 1 });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
}

function updateCartItem(index, change) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const item = cart[index];
  if (!item) return;

  item.quantity = (Number(item.quantity) || 1) + change;
  if (item.quantity <= 0) cart.splice(index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
}

function removeFromCart(index) {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart.splice(index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  let container = document.getElementById('cart-items');
  if (!container) return;

  let subtotal = 0;
  let itemCount = 0;
  container.innerHTML = cart.map((item, i) => {
    const quantity = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    subtotal += price * quantity;
    itemCount += quantity;
    return `
      <tr class="cart-row">
        <td class="px-6 py-5">
          <div class="flex items-center gap-4">
            <img src="${item.image || '/img/latte.png'}" alt="${item.name}" class="w-16 h-16 rounded-lg object-cover" />
            <span class="font-heading font-semibold text-brown">${item.name}</span>
          </div>
        </td>
        <td class="px-6 py-5 text-center text-brown/80">${formatPrice(price)}</td>
        <td class="px-6 py-5">
          <div class="flex items-center justify-center gap-3">
            <button type="button" class="qty-btn w-8 h-8 flex items-center justify-center rounded-full border border-brown text-brown font-bold" data-action="decrease" data-index="${i}" aria-label="Giảm số lượng">−</button>
            <span class="w-6 text-center font-medium text-brown">${quantity}</span>
            <button type="button" class="qty-btn w-8 h-8 flex items-center justify-center rounded-full border border-brown text-brown font-bold" data-action="increase" data-index="${i}" aria-label="Tăng số lượng">+</button>
          </div>
        </td>
        <td class="px-6 py-5 text-center font-semibold text-brown">${formatPrice(price * quantity)}</td>
        <td class="px-6 py-5 text-center">
          <button type="button" class="remove-btn text-brown/50" data-action="remove" data-index="${i}" aria-label="Xóa ${item.name}">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  const shipping = subtotal > 0 ? 20000 : 0;
  const subtotalElement = document.getElementById('cart-subtotal');
  const shippingElement = document.getElementById('cart-shipping');
  const totalElement = document.getElementById('cart-total');
  const emptyCart = document.getElementById('empty-cart');
  const cartContent = container.closest('.grid');

  if (subtotalElement) subtotalElement.textContent = formatPrice(subtotal);
  if (shippingElement) shippingElement.textContent = formatPrice(shipping);
  if (totalElement) totalElement.textContent = formatPrice(subtotal + shipping);
  if (emptyCart) emptyCart.classList.toggle('hidden', cart.length > 0);
  if (cartContent) cartContent.classList.toggle('hidden', cart.length === 0);
  document.querySelectorAll('a[href="/cart"] span').forEach(counter => {
    counter.textContent = itemCount;
  });
}

function formatPrice(value) {
  return `${value.toLocaleString('vi-VN')} VND`;
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const index = Number(button.dataset.index);
  const action = button.dataset.action;
  if (action === 'increase') updateCartItem(index, 1);
  if (action === 'decrease') updateCartItem(index, -1);
  if (action === 'remove') removeFromCart(index);
});

document.addEventListener('DOMContentLoaded', renderCart);

window.updateCartBadge = function (count) {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  badge.textContent = count > 10 ? '10+' : count;
};
 