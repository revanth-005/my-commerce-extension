function logStructured (logger, level, action, message, fields = {}) {
    logger[level]({
        action,
        message,
        ...fields,
        timestamp: new Date().toISOString(),
    });
}

module.exports = { logStructured };
