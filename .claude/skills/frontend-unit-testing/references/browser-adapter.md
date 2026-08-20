# Browser adapter testing

An adapter in `features/*/infrastructure/<technology>/` is a plain exported function that drives the browser: it sends the user to an address, or it sends a form to another site. It takes the `Document` as its first parameter, so that the test gives a double. The canonical references are `features/providers/infrastructure/github/open-provider-installation.spec.ts` and `features/providers/infrastructure/github/submit-provider-manifest.spec.ts`.

**For a navigation, give a minimal double of the document.** There is no `TestBed` and no `beforeEach`:

```ts
const assign = vi.fn();
const document = { location: { assign } } as unknown as Document;

openProviderInstallation(document, 'acme-github', 'a1b2c3');

expect(assign).toHaveBeenCalledWith('https://github.com/apps/acme-github/installations/new?state=a1b2c3');
```

Assert the whole address in one `toHaveBeenCalledWith`, and write a separate test for the escaping of each argument that the function puts into the URL.

**For a form, use the real document of `jsdom`, and spy on the send.** `jsdom` implements no navigation, and a real `submit()` prints an error. Thus replace it, and write the cause in a comment:

```ts
beforeEach(() => {
    submit = vi.fn<() => void>();
    // jsdom implements no navigation, so the send of the form is a spy.
    vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(submit);
    document.body.innerHTML = '';
});

afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
});
```

Clean `document.body` before and after each test, because the document is shared between the tests of the file.

**Assert the form as the other site receives it:** the verb (`method`), the address (`action`), the count of the fields, the name and the type of each field, and the content of each field. Parse a field that carries JSON, and compare the object:

```ts
expect(JSON.parse(fields[0].value)).toEqual(manifest);
```

**Cover these cases:** the ordinary call; the escaping of each argument; each field that the function writes; and the value that stays empty or absent, when the contract allows one.
