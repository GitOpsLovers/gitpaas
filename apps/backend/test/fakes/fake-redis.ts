/**
 * In-memory doubles for Redis, so the log-store specs need no Redis server.
 *
 * `FakeRedis` implements the handful of commands the log store uses — the
 * stream primitives plus `SET`, `EXISTS`, `EXPIRE`, `DEL`, `SCAN` and `MULTI` —
 * over plain maps. `FakeRedisConnection` hands that single client out as both
 * the command and the blocking connection, and counts how often the blocking one
 * was asked for.
 */

/** One entry of a fake stream: its identifier and its flat field/value list. */
export type FakeStreamEntry = [id: string, fields: string[]];

/** Reads the numeric part of a stream identifier, so entries can be ordered. */
const toOrdinal = (id: string): number => Number(id.split('-')[0]);

/** Resolves on the next macrotask, standing in for a short `BLOCK`. */
const tick = (): Promise<void> =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });

/**
 * In-memory Redis stub covering the commands the log store issues.
 */
export class FakeRedis {
    /** Every stream held, keyed by its Redis key. */
    public readonly streams = new Map<string, FakeStreamEntry[]>();

    /** Every plain string key held, such as the producer leases. */
    public readonly values = new Map<string, string>();

    /** Expiries set on a key, in seconds. */
    public readonly expirations = new Map<string, number>();

    /** Raw arguments of every `XADD`, in call order. */
    public readonly xaddCalls: Array<Array<string | number>> = [];

    /** Keys handed to `DEL`, in call order. */
    public readonly deleted: string[] = [];

    /** Number of `XREAD` calls served so far. */
    public reads = 0;

    /** Failure thrown by the next command, when a spec arms one. */
    public failure?: Error;

    /** Identifier handed to the next appended entry. */
    private sequence = 0;

    /**
     * Appends an entry, honouring a `MAXLEN` cap when the caller passes one.
     *
     * @param key Stream key
     * @param args Optional trimming arguments, the `*` identifier and the fields
     *
     * @returns Identifier of the appended entry
     */
    public async xadd(key: string, ...args: Array<string | number>): Promise<string> {
        this.reject();
        this.xaddCalls.push([key, ...args]);

        const start = args.indexOf('*');
        const fields = args.slice(start + 1).map(String);
        const id = `${(this.sequence += 1)}-0`;
        const entries = this.streams.get(key) ?? [];

        entries.push([id, fields]);

        const maxLenIndex = args.indexOf('MAXLEN');

        if (maxLenIndex >= 0) {
            const maxLen = Number(args[start - 1]);

            entries.splice(0, Math.max(0, entries.length - maxLen));
        }

        this.streams.set(key, entries);

        return id;
    }

    /**
     * Returns every entry of a stream, oldest first.
     *
     * @param key Stream key
     *
     * @returns Entries of the stream
     */
    public async xrange(key: string, _start: string, _end: string): Promise<FakeStreamEntry[]> {
        this.reject();

        return [...(this.streams.get(key) ?? [])];
    }

    /**
     * Returns the entries added after a cursor, or null when the stream is idle.
     *
     * @param args `COUNT`, `BLOCK` and `STREAMS` arguments, as ioredis sends them
     *
     * @returns Stream reply, or null when nothing new arrived
     */
    public async xread(...args: Array<string | number>): Promise<Array<[string, FakeStreamEntry[]]> | null> {
        this.reject();
        this.reads += 1;

        const streamsIndex = args.indexOf('STREAMS');
        const key = String(args[streamsIndex + 1]);
        const cursor = toOrdinal(String(args[streamsIndex + 2]));
        const countIndex = args.indexOf('COUNT');
        const count = countIndex >= 0 ? Number(args[countIndex + 1]) : Number.MAX_SAFE_INTEGER;
        const entries = (this.streams.get(key) ?? [])
            .filter(([id]) => toOrdinal(id) > cursor)
            .slice(0, count);

        if (entries.length === 0) {
            // Stand in for the server-side BLOCK, so a polling reader yields.
            await tick();

            return null;
        }

        return [[key, entries]];
    }

    /**
     * Sets a plain string key, honouring an `EX` time to live when given.
     *
     * @param key Key to set
     * @param value Value to store
     * @param args Optional `EX` token and its time to live
     *
     * @returns The `OK` reply
     */
    public async set(key: string, value: string, ...args: Array<string | number>): Promise<'OK'> {
        this.reject();
        this.values.set(key, value);

        const expiryIndex = args.indexOf('EX');

        if (expiryIndex >= 0) {
            this.expirations.set(key, Number(args[expiryIndex + 1]));
        }

        return 'OK';
    }

    /**
     * Opens a pipeline queuing commands until they are executed.
     *
     * @returns A pipeline running against this client
     */
    public multi(): FakeRedisPipeline {
        return new FakeRedisPipeline(this);
    }

    /**
     * Tells whether a key is held.
     *
     * @param key Key to look up
     *
     * @returns `1` when the key exists, `0` otherwise
     */
    public async exists(key: string): Promise<number> {
        this.reject();

        return this.streams.has(key) || this.values.has(key) ? 1 : 0;
    }

    /**
     * Records an expiry on a key.
     *
     * @param key Key to expire
     * @param seconds Time to live
     *
     * @returns `1` when the key exists, `0` otherwise
     */
    public async expire(key: string, seconds: number): Promise<number> {
        this.reject();

        if (!this.streams.has(key) && !this.values.has(key)) {
            return 0;
        }

        this.expirations.set(key, seconds);

        return 1;
    }

    /**
     * Drops a key.
     *
     * @param key Key to drop
     *
     * @returns `1` when a key was dropped, `0` otherwise
     */
    public async del(key: string): Promise<number> {
        this.reject();
        this.deleted.push(key);

        const dropped = this.streams.delete(key) || this.values.delete(key);

        this.expirations.delete(key);

        return dropped ? 1 : 0;
    }

    /**
     * Returns every key matching a prefix pattern in a single pass.
     *
     * @param _cursor Scan cursor
     * @param _matchToken `MATCH` token
     * @param pattern Key pattern, `prefix*`
     *
     * @returns The final cursor and the matching keys
     */
    public async scan(
        _cursor: string | number,
        _matchToken: 'MATCH',
        pattern: string,
        ..._rest: Array<string | number>
    ): Promise<[string, string[]]> {
        this.reject();

        const prefix = pattern.replace(/\*$/, '');
        const keys = [...this.streams.keys()].filter((key) => key.startsWith(prefix));

        return ['0', keys];
    }

    /** Throws the armed failure, once. */
    private reject(): void {
        const failure = this.failure;

        if (failure) {
            this.failure = undefined;

            throw failure;
        }
    }
}

/**
 * Pipeline stub queuing commands and replaying them against the client on `exec`.
 */
export class FakeRedisPipeline {
    /** Commands queued so far, in call order. */
    private readonly commands: Array<() => Promise<unknown>> = [];

    constructor(private readonly client: FakeRedis) {}

    /**
     * Queues an append.
     *
     * @param key Stream key
     * @param args Optional trimming arguments, the `*` identifier and the fields
     *
     * @returns The pipeline, so calls chain
     */
    public xadd(key: string, ...args: Array<string | number>): this {
        this.commands.push(() => this.client.xadd(key, ...args));

        return this;
    }

    /**
     * Queues a plain string write.
     *
     * @param key Key to set
     * @param value Value to store
     * @param args Optional `EX` token and its time to live
     *
     * @returns The pipeline, so calls chain
     */
    public set(key: string, value: string, ...args: Array<string | number>): this {
        this.commands.push(() => this.client.set(key, value, ...args));

        return this;
    }

    /**
     * Runs every queued command in order.
     *
     * @returns One `[error, reply]` pair per queued command
     */
    public async exec(): Promise<Array<[Error | null, unknown]>> {
        const replies: Array<[Error | null, unknown]> = [];

        for (const command of this.commands) {
            replies.push([null, await command()]);
        }

        return replies;
    }
}

/**
 * Redis connection stub handing the same fake client to every caller.
 */
export class FakeRedisConnection {
    /** Number of times the blocking connection was asked for. */
    public blockingCalls = 0;

    constructor(private readonly client: FakeRedis) {}

    /**
     * Returns the shared command connection.
     *
     * @returns The fake client
     */
    public getClient(): FakeRedis {
        return this.client;
    }

    /**
     * Returns the connection reserved for the commands that block.
     *
     * @returns The fake client
     */
    public getBlockingClient(): FakeRedis {
        this.blockingCalls += 1;

        return this.client;
    }
}
