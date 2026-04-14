# Events Library Tutorial: Decoupling Your Application Logic

Welcome to the **@triplestore/events** developer tutorial. This guide shows how to implement reactive patterns using the minimalist `EventEmitter`.

## 1. Basic Usage

Extend the `EventEmitter` class to add reactive capabilities to your own services.

```typescript
import { EventEmitter } from '@triplestore/events';

class HeartbeatMonitor extends EventEmitter {
    start() {
        setInterval(() => {
            this.emit('pulse', Date.now());
        }, 1000);
    }
}

const monitor = new HeartbeatMonitor();

// Subscribe to events
const onPulse = (time) => console.log('Pulse at:', time);
monitor.on('pulse', onPulse);

// Start emitting
monitor.start();
```

## 2. One-time Events

Use `once()` for events that should only trigger a single action, like initialization.

```typescript
monitor.once('start', () => {
    console.log("Monitor has started!");
});
```

## 3. Managing Listeners

It is crucial to remove listeners in components that are destroyed to prevent memory leaks.

```typescript
// Unsubscribe from a specific function
monitor.off('pulse', onPulse);

// Unsubscribe from all pulse events
monitor.removeAllListeners('pulse');

// Wipe the entire emitter
monitor.removeAllListeners();
```

## 4. Advanced Patterns: Worker Integration

Since this library has **Zero Dependencies**, you can bundle it into a Web Worker without any complex polyfills.

```typescript
// Inside Worker
import { EventEmitter } from './events';

const bus = new EventEmitter();
self.onmessage = (e) => {
    bus.emit(e.data.type, e.data.payload);
};
```

---

> [!IMPORTANT]
> The `EventEmitter` is synchronous. If you have expensive logic listening to an event, consider wrapping it in `requestAnimationFrame` or `setTimeout` within the listener to avoid blocking the emission chain.
