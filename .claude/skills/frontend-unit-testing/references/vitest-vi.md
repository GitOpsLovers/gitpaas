---
name: vi-utilities
description: vi helper for mocking, timers, utilities
---

# Vi Utilities

The `vi` helper provides mocking and utility functions. This project runs Vitest 4, and its specs
use the globals, so they import nothing from `vitest`. They mock a collaborator with a double of
`TestBed`, and never a module.

```ts
import { vi } from 'vitest'
```

## Mock Functions

```ts
// Create mock
const fn = vi.fn()
const fnWithImpl = vi.fn((x) => x * 2)

// Check if mock
vi.isMockFunction(fn) // true

// Mock methods
fn.mockReturnValue(42)
fn.mockReturnValueOnce(1)
fn.mockResolvedValue(data)
fn.mockRejectedValue(error)
fn.mockImplementation(() => 'result')
fn.mockImplementationOnce(() => 'once')

// Clear/reset
fn.mockClear()    // Clear call history
fn.mockReset()    // Clear history + implementation
fn.mockRestore()  // Restore original (for spies)
```

## Spying

```ts
const obj = { method: () => 'original' }

const spy = vi.spyOn(obj, 'method')
obj.method()

expect(spy).toHaveBeenCalled()

// Mock implementation
spy.mockReturnValue('mocked')

// Spy on getter/setter
vi.spyOn(obj, 'prop', 'get').mockReturnValue('value')
```

## Assertion Helpers — vi.defineHelper (4.1+)

Wrap reusable assertion functions so failures point at the **call site**, not inside the helper:

```ts
const expectValidUser = vi.defineHelper((user: unknown) => {
  expect(user).toHaveProperty('id')
  expect(user).toHaveProperty('email')
})

test('returns a valid user', async () => {
  expectValidUser(await fetchUser('alice')) // failures reported here
})
```

## Fake Timers

```ts
vi.useFakeTimers()

// Choose which timers to fake (toFake and toNotFake are mutually exclusive)
vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
vi.useFakeTimers({ toNotFake: ['setInterval'] })

setTimeout(() => console.log('done'), 1000)

// Advance time
vi.advanceTimersByTime(1000)
vi.advanceTimersByTimeAsync(1000)  // For async callbacks
vi.advanceTimersToNextTimer()
vi.advanceTimersToNextFrame()      // requestAnimationFrame

// Run all timers
vi.runAllTimers()
vi.runAllTimersAsync()
vi.runOnlyPendingTimers()

// Clear timers
vi.clearAllTimers()

// Check state
vi.getTimerCount()
vi.isFakeTimers()

// Restore
vi.useRealTimers()
```

## Mock Date/Time

```ts
vi.setSystemTime(new Date('2024-01-01'))
expect(new Date().getFullYear()).toBe(2024)

vi.getMockedSystemTime()  // Get mocked date
vi.getRealSystemTime()    // Get real time (ms)
```

## Global/Env Mocking

```ts
// Stub global
vi.stubGlobal('fetch', vi.fn())
vi.unstubAllGlobals()

// Stub environment
vi.stubEnv('API_KEY', 'test')
vi.stubEnv('NODE_ENV', 'test')
vi.unstubAllEnvs()
```

## Waiting Utilities

```ts
// Wait for callback to succeed
await vi.waitFor(async () => {
  const el = document.querySelector('.loaded')
  expect(el).toBeTruthy()
}, { timeout: 5000, interval: 100 })

// Wait for truthy value
const element = await vi.waitUntil(
  () => document.querySelector('.loaded'),
  { timeout: 5000 }
)
```

## Mock Object

Mock all methods of an object:

```ts
const original = {
  method: () => 'real',
  nested: { fn: () => 'nested' },
}

const mocked = vi.mockObject(original)
mocked.method()  // undefined (mocked)
mocked.method.mockReturnValue('mocked')

// Spy mode
const spied = vi.mockObject(original, { spy: true })
spied.method()  // 'real'
expect(spied.method).toHaveBeenCalled()
```

## Test Configuration

```ts
vi.setConfig({
  testTimeout: 10_000,
  hookTimeout: 10_000,
})

vi.resetConfig()
```

## Global Mock Management

```ts
vi.clearAllMocks()   // Clear all mock call history
vi.resetAllMocks()   // Reset + clear implementation
vi.restoreAllMocks() // Restore originals (spies)
```

## Key Points

- Use `vi.spyOn` to spy on existing methods (v4: supports constructors)
- Use `vi.defineHelper` for an assertion helper
- Fake timers require explicit setup and teardown
- `vi.waitFor` retries until assertion passes

<!-- 
Source references:
- https://vitest.dev/api/vi.html
-->
