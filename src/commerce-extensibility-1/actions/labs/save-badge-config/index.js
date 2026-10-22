const crypto = require('crypto');
const { Core } = require('@adobe/aio-sdk');
const { successResponse, errorResponse } = require('../../utils');
const { logStructured } = require('../../logging');
const { saveConfig } = require('../../config-store');
const { validateConfig } = require('../../badges');

const ACTION = 'save-badge-config';

async function main (params) {
  const startTime = Date.now();
  const correlationId = params['x-correlation-id'] || crypto.randomUUID();
  const logger = Core.Logger(ACTION, { level: params.LOG_LEVEL || 'info' });

  try {
    if (params.__ow_method && params.__ow_method.toLowerCase() !== 'post') {
      return errorResponse(405, 'Use POST to save badge settings', correlationId);
    }

    logStructured(logger, 'info', ACTION, 'Action invoked', { correlationId });

    const { config, errors } = validateConfig(params.config);
    if (errors.length > 0) {
      logStructured(logger, 'warn', ACTION, 'Badge settings rejected', { correlationId, errors });
      return errorResponse(400, errors.join('; '), correlationId);
    }

    const updatedAt = await saveConfig(config);

    logStructured(logger, 'info', ACTION, 'Action completed', {
      correlationId,
      config,
      durationMs: Date.now() - startTime,
    });

    return successResponse({ config, updatedAt }, correlationId);
  } catch (error) {
    logStructured(logger, 'error', ACTION, 'Action failed', {
      correlationId,
      error: error.message,
      durationMs: Date.now() - startTime,
    });
    return errorResponse(500, 'Could not save badge settings', correlationId);
  }
}

exports.main = main;
