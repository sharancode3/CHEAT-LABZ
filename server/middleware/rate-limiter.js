export function setupRateLimiter(socket, maxEventsPerSecond = 30) {
  let eventCount = 0;
  let blockUntil = 0;

  // Reset counter every second
  const interval = setInterval(() => {
    eventCount = 0;
  }, 1000);

  socket.on('disconnect', () => {
    clearInterval(interval);
  });

  return function checkRateLimit(eventName) {
    const now = Date.now();
    
    // If currently blocked, just return false
    if (now < blockUntil) {
      return false;
    }

    eventCount++;
    
    if (eventCount > maxEventsPerSecond) {
      // Block for the rest of the current second + 1 full second penalty
      blockUntil = now + 1000;
      socket.emit('error:rate_limited', { message: 'Too many requests. Please slow down.' });
      console.warn(`[RATE LIMIT] Socket ${socket.id} exceeded limit (${eventName})`);
      return false;
    }
    
    return true;
  };
}
