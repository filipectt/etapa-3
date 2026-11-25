// @ts-check
const { test, expect } = require('@playwright/test');

const STANDARD_USER = 'standard_user';
const SECRET_SAUCE = 'secret_sauce';

async function loginAsStandardUser(page) {
  await page.goto('/');
  await page.locator('[data-test="username"]').fill(STANDARD_USER);
  await page.locator('[data-test="password"]').fill(SECRET_SAUCE);
  await page.locator('[data-test="login-button"]').click();
  await expect(page).toHaveURL(/.*inventory\.html/);
  await expect(page.locator('.inventory_list')).toBeVisible();
}

test.describe('Swag Labs - Testes E2E (RF02, RF03 e RF07)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test.describe('RF02 - Ordenação dos produtos', () => {
    test('CT-003: Ordenar produtos por nome de A a Z', async ({ page }) => {
      await page.locator('[data-test="product-sort-container"]').selectOption('az');
      const names = await page.locator('.inventory_item_name').allInnerTexts();
      const expected = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(expected);
    });

    test('CT-004: Ordenar produtos por nome de Z a A', async ({ page }) => {
      await page.locator('[data-test="product-sort-container"]').selectOption('za');
      const names = await page.locator('.inventory_item_name').allInnerTexts();
      const expected = [...names].sort((a, b) => b.localeCompare(a));
      expect(names).toEqual(expected);
    });

    test('CT-005: Ordenar produtos do menor para o maior preço', async ({ page }) => {
      await page.locator('[data-test="product-sort-container"]').selectOption('lohi');
      const priceTexts = await page.locator('.inventory_item_price').allInnerTexts();
      const prices = priceTexts.map((p) => parseFloat(p.replace('$', '')));
      const expected = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(expected);
      expect(prices[0]).toBe(7.99);
      expect(prices[prices.length - 1]).toBe(49.99);
    });

    test('CT-006: Ordenar produtos do maior para o menor preço', async ({ page }) => {
      await page.locator('[data-test="product-sort-container"]').selectOption('hilo');
      const priceTexts = await page.locator('.inventory_item_price').allInnerTexts();
      const prices = priceTexts.map((p) => parseFloat(p.replace('$', '')));
      const expected = [...prices].sort((a, b) => b - a);
      expect(prices).toEqual(expected);
      expect(prices[0]).toBe(49.99);
      expect(prices[prices.length - 1]).toBe(7.99);
    });
  });

  test.describe('RF03 - Adição de produtos ao carrinho', () => {
    test('CT-007: Adicionar 1 produto ao carrinho', async ({ page }) => {
      const backpackCard = page
        .locator('.inventory_item')
        .filter({ hasText: 'Sauce Labs Backpack' });

      await backpackCard.locator('button', { hasText: 'Add to cart' }).click();

      await expect(page.locator('.shopping_cart_badge')).toHaveText('1');
      await expect(backpackCard.locator('button')).toHaveText('Remove');
    });

    test('CT-008: Adicionar mais de um produto ao carrinho', async ({ page }) => {
      // 1º produto (pré-condição: carrinho com 1 item)
      const backpackCard = page
        .locator('.inventory_item')
        .filter({ hasText: 'Sauce Labs Backpack' });
      await backpackCard.locator('button', { hasText: 'Add to cart' }).click();
      await expect(page.locator('.shopping_cart_badge')).toHaveText('1');

      // 2º e 3º produtos
      const bikeLightCard = page
        .locator('.inventory_item')
        .filter({ hasText: 'Sauce Labs Bike Light' });
      await bikeLightCard.locator('button', { hasText: 'Add to cart' }).click();

      const boltShirtCard = page
        .locator('.inventory_item')
        .filter({ hasText: 'Sauce Labs Bolt T-Shirt' });
      await boltShirtCard.locator('button', { hasText: 'Add to cart' }).click();

      await expect(page.locator('.shopping_cart_badge')).toHaveText('3');
      await expect(bikeLightCard.locator('button')).toHaveText('Remove');
      await expect(boltShirtCard.locator('button')).toHaveText('Remove');
    });
  });

  test.describe('RF07 - Finalização da compra', () => {
    test('CT-017 e CT-018: Conferir cálculo do resumo e finalizar compra com sucesso', async ({
      page,
    }) => {
      // Adiciona Sauce Labs Backpack ($29.99)
      const backpackCard = page
        .locator('.inventory_item')
        .filter({ hasText: 'Sauce Labs Backpack' });
      await backpackCard.locator('button', { hasText: 'Add to cart' }).click();
      await expect(page.locator('.shopping_cart_badge')).toHaveText('1');

      // Vai para o carrinho e inicia checkout
      await page.locator('.shopping_cart_link').click();
      await expect(page).toHaveURL(/.*cart\.html/);
      await page.locator('[data-test="checkout"]').click();

      // Preenche dados de entrega (Step One)
      await expect(page).toHaveURL(/.*checkout-step-one\.html/);
      await page.locator('[data-test="firstName"]').fill('Filipe');
      await page.locator('[data-test="lastName"]').fill('Costa');
      await page.locator('[data-test="postalCode"]').fill('29000-000');
      await page.locator('[data-test="continue"]').click();

      // CT-017: Conferência do resumo e cálculo (Step Two)
      await expect(page).toHaveURL(/.*checkout-step-two\.html/);
      await expect(page.locator('.cart_item')).toHaveCount(1);
      await expect(page.locator('.inventory_item_name')).toHaveText('Sauce Labs Backpack');

      const subtotalText = await page.locator('.summary_subtotal_label').innerText();
      const taxText = await page.locator('.summary_tax_label').innerText();
      const totalText = await page.locator('.summary_total_label').innerText();

      const itemTotal = parseFloat(subtotalText.replace('Item total: $', ''));
      const tax = parseFloat(taxText.replace('Tax: $', ''));
      const total = parseFloat(totalText.replace('Total: $', ''));

      expect(itemTotal).toBe(29.99);
      expect(Number((itemTotal + tax).toFixed(2))).toBe(total);

      // CT-018: Finalização da compra (Complete)
      await page.locator('[data-test="finish"]').click();
      await expect(page).toHaveURL(/.*checkout-complete\.html/);
      await expect(page.locator('.complete-header')).toHaveText('Thank you for your order!');
      await expect(page.locator('.shopping_cart_badge')).toHaveCount(0);
    });
  });
});