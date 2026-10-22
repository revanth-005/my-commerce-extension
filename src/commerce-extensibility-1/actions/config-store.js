const { Files } = require('@adobe/aio-sdk');
const { DEFAULT_CONFIG, validateConfig } = require('./badges');

const CONFIG_PATH = 'badge-config.json';

// Files storage has no expiry, unlike aio-lib-state, so merchant settings are not lost.
async function loadConfig () {
    const files = await Files.init();
    const found = await files.list(CONFIG_PATH);
    if (found.length === 0) {
        return { config: DEFAULT_CONFIG, updatedAt: null, isDefault: true };
    }
    const stored = JSON.parse((await files.read(CONFIG_PATH)).toString());
    const { config, errors } = validateConfig(stored.config);
    if (errors.length > 0) {
        throw new Error(`Stored badge config is invalid: ${errors.join('; ')}`);
    }
    return { config, updatedAt: stored.updatedAt, isDefault: false };
}

async function saveConfig (config) {
    const files = await Files.init();
    const updatedAt = new Date().toISOString();
    await files.write(CONFIG_PATH, JSON.stringify({ config, updatedAt }));
    return updatedAt;
}

module.exports = { loadConfig, saveConfig };
