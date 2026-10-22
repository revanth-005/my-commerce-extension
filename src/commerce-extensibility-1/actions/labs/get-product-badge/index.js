const crypto = require('crypto');
const { Core } = require('@adobe/aio-sdk');
const stateLib = require('@adobe/aio-lib-state');
const { successResponse, errorResponse } = require('../../utils');
const { badgeKey } = require('../../badges');

const ACTION = 'get-product-badge';

async function main (params) {
  const startTime = Date.now();
  const correlationId = params['x-correlation-id'] || crypto.randomUUID();

  const logger = Core.Logger(ACTION, {
    level: params.LOG_LEVEL || 'info',
  });

  const sku = params.sku;

  const log = (level, message, fields = {}) => logger[level]({
    action: ACTION,
    message,
    correlationId,
    sku,
    ...fields,
    timestamp: new Date().toISOString(),
  });

  try {
    log('info', 'Action invoked');

    if (!sku) {
      log('warn', 'Missing required parameter: sku');
      return errorResponse(400, 'Missing required parameter: sku', correlationId);
    }

    const state = await stateLib.init();
    const result = await state.get(badgeKey(sku));

    if (!result || !result.value) {
      log('info', 'No badge state for SKU', { durationMs: Date.now() - startTime });
      return successResponse({ sku, badges: [], found: false }, correlationId);
    }

    const { badges, updatedAt } = JSON.parse(result.value);

    log('info', 'Action completed', { badges, durationMs: Date.now() - startTime });

    return successResponse({ sku, badges, updatedAt, found: true }, correlationId);
  } catch (error) {
    log('error', 'Action failed', {
      error: error.message,
      stack: error.stack,
      durationMs: Date.now() - startTime,
    });
    return errorResponse(500, 'Internal server error', correlationId);
  }
}

exports.main = main;
