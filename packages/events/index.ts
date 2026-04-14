export class EventEmitter {
    private _events: Map<string, Function[]> = new Map();

    on(event: string, listener: Function): this {
        if (!this._events.has(event)) this._events.set(event, []);
        this._events.get(event)!.push(listener);
        return this;
    }

    addListener(event: string, listener: Function): this {
        return this.on(event, listener);
    }

    off(event: string, listener: Function): this {
        const listeners = this._events.get(event);
        if (listeners) {
            this._events.set(event, listeners.filter(l => l !== listener));
        }
        return this;
    }

    removeListener(event: string, listener: Function): this {
        return this.off(event, listener);
    }

    removeAllListeners(event?: string): this {
        if (event) {
            this._events.delete(event);
        } else {
            this._events.clear();
        }
        return this;
    }

    emit(event: string, ...args: any[]): boolean {
        const listeners = this._events.get(event);
        if (!listeners || listeners.length === 0) return false;
        for (const l of listeners) l(...args);
        return true;
    }

    once(event: string, listener: Function): this {
        const wrapper = (...args: any[]) => {
            this.off(event, wrapper);
            listener(...args);
        };
        return this.on(event, wrapper);
    }

    listenerCount(event: string): number {
        return this._events.get(event)?.length ?? 0;
    }

    prependListener(event: string, listener: Function): this {
        if (!this._events.has(event)) this._events.set(event, []);
        this._events.get(event)!.unshift(listener);
        return this;
    }

    eventNames(): string[] {
        return [...this._events.keys()];
    }

    setMaxListeners(_n: number): this {
        return this;
    }
}

export default EventEmitter;
