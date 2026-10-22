const crypto = require('crypto');
const { Core } = require('@adobe/aio-sdk');
const stateLib = require('@adobe/aio-lib-state');
const { successResponse, errorResponse } = require('../../utils');
const { getImsAccessToken } = require('../../ims');
const { badgeKey, computeBadges, DEFAULT_CONFIG } = require('../../badges');
const { loadConfig } = require('../../config-store');

const ACTION = 'product-event-consumer';
const BADGE_TTL_SECONDS = 2592000;
const EVENT_TTL_SECONDS = 86400;

async function main (params) {
  const startTime = Date.now();
  const correlationId = params['x-correlation-id'] || crypto.randomUUID();

  const logger = Core.Logger(ACTION, {
    level: params.LOG_LEVEL || 'info',
  });

  const eventId = params.event_id;
  const eventType = params.type || params.event_type || 'unknown';
  const eventData = params.data?.value || params.event?.data || {};
  const sku = eventData.sku;

  const log = (level, message, fields = {}) => logger[level]({
    action: ACTION,
    message,
    correlationId,
    eventId,
    eventType,
    sku,
    ...fields,
    timestamp: new Date().toISOString(),
  });

  try {
    log('info', 'Action invoked');

    if (!sku) {
      log('warn', 'No SKU in event payload, skipping');
      return successResponse({ message: 'No SKU in payload, skipping', eventId }, correlationId);
    }

    const state = await stateLib.init();

    if (eventId) {
      const processed = await state.get(`badge-event-${eventId}`);
      if (processed && processed.value) {
        log('info', 'Event already processed, skipping');
        return successResponse({ message: 'Event already processed', eventId }, correlationId);
      }
    }

    const baseUrl = params.COMMERCE_API_BASE_URL.replace(/\/$/, '');
    const accessToken = await getImsAccessToken(params);

    const response = await fetch(`${baseUrl}/V1/products/${encodeURIComponent(sku)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-api-key': params.IMS_OAUTH_S2S_CLIENT_ID,
        'x-gw-ims-org-id': params.IMS_OAUTH_S2S_ORG_ID,
        'Content-Type': 'application/json',
      },
    });

    const key = badgeKey(sku);

    if (response.status === 404) {
      await state.delete(key);
      log('info', 'Product not found in Commerce, badge state removed', {
        durationMs: Date.now() - startTime,
      });
      return successResponse({ message: 'Product not found, badge state removed', sku, eventId }, correlationId);
    }

    if (!response.ok) {
      log('error', 'Commerce API request failed', {
        status: response.status,
        durationMs: Date.now() - startTime,
      });
      // A non-2xx result lets I/O Events retry the delivery.
      return errorResponse(502, `Failed to fetch product ${sku}`, correlationId);
    }

    const product = await response.json();

    let config = DEFAULT_CONFIG;
    try {
      ({ config } = await loadConfig());
    } catch (error) {
      log('warn', 'Could not load badge settings, using defaults', { error: error.message });
    }

    const badges = computeBadges(product, config);

    await state.put(
      key,
      JSON.stringify({
        sku,
        badges,
        updatedAt: new Date().toISOString(),
        sourceEventId: eventId,
        correlationId,
      }),
      { ttl: BADGE_TTL_SECONDS }
    );

    if (eventId) {
      await state.put(`badge-event-${eventId}`, JSON.stringify({ processedAt: new Date().toISOString() }), {
        ttl: EVENT_TTL_SECONDS,
      });
    }

    log('info', 'Action completed', {
      badges,
      durationMs: Date.now() - startTime,
    });

    return successResponse({ message: 'Badge state updated', sku, badges, eventId }, correlationId);
  } catch (error) {
    log('error', 'Event processing failed', {
      error: error.message,
      stack: error.stack,
      durationMs: Date.now() - startTime,
    });
    return errorResponse(500, 'Event processing failed', correlationId);
  }
}

exports.main = main;
