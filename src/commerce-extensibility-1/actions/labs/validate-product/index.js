const { Core } = require('@adobe/aio-sdk');
const { successResponse } = require('../../utils');
const { logStructured } = require('../../logging');

const ACTION = 'validate-product';

async function main (params) {
  const startTime = Date.now();
  const correlationId = params['x-correlation-id'] || require('crypto').randomUUID();

  const logger = Core.Logger(ACTION, {
    level: params.LOG_LEVEL || 'info',
  });

  const product = params.product || params.data?.product;

  logStructured(logger, 'info', ACTION, 'Action invoked', {
    correlationId,
    sku: product?.sku,
  });

  try {
    if (!product) {
      logStructured(logger, 'warn', ACTION, 'No product data in webhook payload', { correlationId });
      return successResponse({ op: 'success' }, correlationId);
    }

    const name = product.name != null ? String(product.name) : '';
    if (name.toLowerCase().includes('invalid')) {
      const message =
        'Product validation failed: product name must not contain the word "invalid".';
      logStructured(logger, 'warn', ACTION, message, {
        correlationId,
        sku: product.sku,
        durationMs: Date.now() - startTime,
      });
      return successResponse({ op: 'exception', message }, correlationId);
    }

    logStructured(logger, 'info', ACTION, 'Action completed: product passed validation', {
      correlationId,
      sku: product.sku,
      durationMs: Date.now() - startTime,
    });
    return successResponse({ op: 'success' }, correlationId);
  } catch (error) {
    logStructured(logger, 'error', ACTION, 'Webhook handler failed', {
      correlationId,
      sku: product?.sku,
      error: error.message,
      durationMs: Date.now() - startTime,
    });
    return successResponse({ op: 'success' }, correlationId);
  }
}

exports.main = main;
