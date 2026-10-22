const { Core } = require('@adobe/aio-sdk');
const stateLib = require('@adobe/aio-lib-state');
const { successResponse, errorResponse } = require('../../utils');
const { logStructured } = require('../../logging');

const ACTION = 'get-enriched-orders';

async function main (params) {
  const startTime = Date.now();
  const correlationId =
      params['x-correlation-id'] || require('crypto').randomUUID();

  const logger = Core.Logger(ACTION, {
    level: params.LOG_LEVEL || 'info',
  });

  logStructured(logger, 'info', ACTION, 'Action invoked', {
    correlationId,
    orderIds: params.orderIds,
  });

  try {
    const state = await stateLib.init();

    const orderKeys = params.orderIds
      ? params.orderIds.split(',').map((id) => `order-${id.trim()}`)
      : [];

    if (orderKeys.length === 0) {
      const knownOrders = await state.get('known-order-ids');
      if (knownOrders && knownOrders.value) {
        const ids = JSON.parse(knownOrders.value);
        orderKeys.push(...ids.map((id) => `order-${id}`));
      }
    }

    const orders = [];
    for (const key of orderKeys) {
      const result = await state.get(key);
      if (result && result.value) {
        orders.push(JSON.parse(result.value));
      }
    }

    orders.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));

    const summary = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce(
        (sum, o) => sum + parseFloat(o.grandTotal || 0),
        0
      ),
      tierBreakdown: orders.reduce((acc, o) => {
        const tier = o.enrichment?.orderTier || 'unknown';
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {}),
      highValueCount: orders.filter(
        (o) => o.enrichment?.isHighValue
      ).length,
    };

    logStructured(logger, 'info', ACTION, 'Action completed', {
      correlationId,
      orderCount: orders.length,
      durationMs: Date.now() - startTime,
    });

    return successResponse(
        { orders, summary },
        correlationId
    );
  } catch (error) {
    logStructured(logger, 'error', ACTION, 'Failed to fetch enriched orders', {
      correlationId,
      orderIds: params.orderIds,
      error: error.message,
      durationMs: Date.now() - startTime,
    });
    return errorResponse(
        500,
        'Failed to fetch enriched orders',
        correlationId
    );
  }
}

exports.main = main;
