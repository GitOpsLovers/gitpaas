# Storage service testing

A service in `features/*/infrastructure/storage/` holds the persistence of the browser. It reads and writes `localStorage` or `sessionStorage`, and it publishes the values as signals. The canonical reference is `features/authentication/infrastructure/storage/token-storage.service.spec.ts`.

**Give a double of `Storage`, because `jsdom` gives no usable one here.** Write a factory above the `describe`, with one TSDoc block that states the cause:

```ts
/**
 * Minimal in-memory `Storage` implementation, since the test environment does
 * not expose real `localStorage`/`sessionStorage`.
 */
function createStorage(): Storage {
    const map = new Map<string, string>();

    return {
        get length(): number { return map.size; },
        clear: (): void => { map.clear(); },
        getItem: (key: string): string | null => (map.has(key) ? map.get(key) ?? null : null),
        key: (index: number): string | null => Array.from(map.keys())[index] ?? null,
        removeItem: (key: string): void => { map.delete(key); },
        setItem: (key: string, value: string): void => { map.set(key, String(value)); },
    };
}
```

**Put the double in place with `vi.stubGlobal`, and remove it after each test:**

```ts
beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage());
    vi.stubGlobal('sessionStorage', createStorage());
});

afterEach(() => {
    vi.unstubAllGlobals();
});
```

**Build the SUT with `new`, inside the test.** The service reads the storage in its constructor. Thus the test arranges the storage first, and then it constructs:

```ts
localStorage.setItem(ACCESS_TOKEN_KEY, 'access-local');

const service = new TokenStorageService();

expect(service.accessToken()).toBe('access-local');
```

There is no `TestBed` here, because the service injects nothing.

**Declare each key of the storage as a module-level UPPER_SNAKE constant.** The spec then states the contract of the key, which the rest of the application depends on.

**Assert both sides of each operation**: the content of the two storages (the one that received the value, and the one that stayed empty), and the value of each signal. A write that chooses a storage must also clear the other storage.

**Cover these cases:** each branch of the choice of the storage; the update that reuses the active storage; the fall back when no storage is active; the clear that wipes both storages and resets the signals; and the hydration of the constructor with each combination (only one storage, both storages, and neither storage).
