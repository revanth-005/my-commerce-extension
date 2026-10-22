const crypto = require('crypto');
const { Core } = require('@adobe/aio-sdk');
const { successResponse, errorResponse } = require('../../utils');
const { logStructured } = require('../../logging');
const { loadConfig } = require('../../config-store');
const { DEFAULT_CONFIG } = require('../../badges');

const ACTION = 'get-badge-config';

async function main (params) {
  const startTime = Date.now();
  const correlationId = params['x-correlation-id'] || crypto.randomUUID();
  const logger = Core.Logger(ACTION, { level: params.LOG_LEVEL || 'info' });

  try {
    logStructured(logger, 'info', ACTION, 'Action invoked', { correlationId });

    const { config, updatedAt, isDefault } = await loadConfig();

    logStructured(logger, 'info', ACTION, 'Action completed', {
      correlationId,
      isDefault,
      durationMs: Date.now() - startTime,
    });

    return successResponse({ config, defaults: DEFAULT_CONFIG, updatedAt, isDefault }, correlationId);
  } catch (error) {
    logStructured(logger, 'error', ACTION, 'Action failed', {
      correlationId,
      error: error.message,
      durationMs: Date.now() - startTime,
    });
    return errorResponse(500, 'Could not load badge settings', correlationId);
  }
}

exports.main = main;
