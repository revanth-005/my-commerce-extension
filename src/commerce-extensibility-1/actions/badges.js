const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_CONFIG = {
  newBadge: { enabled: true, days: 30 },
  saleBadge: { enabled: true, minDiscountPercent: 1 },
  lowStockBadge: { enabled: true, threshold: 5 },
};

// aio-lib-state keys only allow [a-zA-Z0-9-_.], but SKUs can contain any character.
function badgeKey (sku) {
    return `badge-${Buffer.from(String(sku)).toString('base64url')}`;
}

function getAttribute (product, code) {
    return product.custom_attributes?.find((a) => a.attribute_code === code)?.value;
}

function checkSection (input, name, fields, errors) {
    const section = input?.[name] ?? {};
    const result = { enabled: section.enabled };
    if (typeof section.enabled !== 'boolean') {
        errors.push(`${name}.enabled must be true or false`);
    }
    for (const [field, { min, max, integer }] of Object.entries(fields)) {
        const value = section[field];
        const ok = typeof value === 'number'
            && Number.isFinite(value)
            && value >= min
            && value <= max
            && (!integer || Number.isInteger(value));
        if (!ok) {
            errors.push(`${name}.${field} must be ${integer ? 'a whole number' : 'a number'} between ${min} and ${max}`);
        }
        result[field] = value;
    }
    return result;
}

// Returns { config, errors }. The config is only usable when errors is empty.
function validateConfig (input) {
    const errors = [];
    const config = {
        newBadge: checkSection(input, 'newBadge', { days: { min: 1, max: 365, integer: true } }, errors),
        saleBadge: checkSection(input, 'saleBadge', { minDiscountPercent: { min: 0, max: 100 } }, errors),
        lowStockBadge: checkSection(input, 'lowStockBadge', { threshold: { min: 1, max: 10000, integer: true } }, errors),
    };
    return { config, errors };
}

function computeBadges (product, config = DEFAULT_CONFIG, now = Date.now()) {
    // Commerce REST: status 1 = enabled, 2 = disabled
    if (Number(product.status) === 2) return [];

    const badges = [];

    if (config.saleBadge.enabled) {
        const price = parseFloat(product.price);
        const specialPrice = parseFloat(getAttribute(product, 'special_price'));
        if (price > 0 && !Number.isNaN(specialPrice) && specialPrice < price) {
            const discountPercent = ((price - specialPrice) / price) * 100;
            if (discountPercent >= config.saleBadge.minDiscountPercent) {
                badges.push('sale');
            }
        }
    }

    if (config.newBadge.enabled) {
        // created_at is UTC without a zone, e.g. "2026-10-01 12:00:00"
        const createdAt = Date.parse(String(product.created_at).replace(' ', 'T') + 'Z');
        if (!Number.isNaN(createdAt) && now - createdAt <= config.newBadge.days * DAY_MS) {
            badges.push('new');
        }
    }

    if (config.lowStockBadge.enabled) {
        const stock = product.extension_attributes?.stock_item;
        if (stock && stock.manage_stock !== false && typeof stock.qty === 'number'
            && stock.qty > 0 && stock.qty <= config.lowStockBadge.threshold) {
            badges.push('low-stock');
        }
    }

    return badges;
}

module.exports = { DEFAULT_CONFIG, badgeKey, computeBadges, validateConfig };
