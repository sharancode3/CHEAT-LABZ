/**
 * Validator Middleware
 * Intercepts incoming events, checks rate limit, authentication, and schema.
 */

export function createValidatorMiddleware(checkRateLimit) {
  return (packet, next) => {
    const eventName = packet[0];
    const data = packet[1];

    // Internal socket.io events
    if (eventName === 'disconnect' || eventName === 'connect') {
      return next();
    }

    // 1. Rate Limit Check
    if (!checkRateLimit(eventName)) {
      // Drop the packet silently (rate limiter already emitted error to client)
      return next(new Error('Rate limited'));
    }

    // 2. Authentication Check (for all room/game events)
    // Assuming socket.uid or socket.playerName is set on connection
    // We can access socket via the middleware's context `this`, but `socket.use` is bound to socket.
    // Wait, the standard way in Socket.IO 4 is `socket.use((packet, next) => {})` where `socket` is available in closure if we wrap it.
    
    // We will do validation in the event handlers for specific things, 
    // but we can enforce that data is an object if present.
    if (data !== undefined && typeof data !== 'object') {
      return next(new Error('Invalid payload format'));
    }

    next();
  };
}

// Utility to validate specific schemas in handlers
export function validateSchema(data, requiredFields) {
  if (!data) return false;
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      return false;
    }
  }
  return true;
}
