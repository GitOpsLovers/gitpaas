# TailAdmin: Modal

> **Caution.** The markup below comes from an older generation of TailAdmin. Its
> class names differ from the ones of this project. Copy the structure, and then
> map each class onto a token of `apps/frontend/src/styles.css`. Read
> `custom-configuration.md` for the map. A template under
> `apps/frontend/src/app` gives a better example than this file.

## Modal

```html
<div x-show="modalOpen" x-transition
     class="fixed top-0 left-0 z-999999 flex h-full min-h-screen w-full items-center justify-center bg-black/90 px-4 py-5">
  <div class="w-full max-w-142.5 rounded-lg bg-white py-12 px-8 text-center dark:bg-boxdark md:py-15 md:px-17.5">
    <span class="mx-auto inline-block">
      <!-- Modal icon -->
    </span>
    <h3 class="mt-5.5 pb-2 text-xl font-bold text-black dark:text-white sm:text-2xl">
      Modal Title
    </h3>
    <p class="mb-10">
      Modal description text goes here.
    </p>
    <div class="flex flex-wrap justify-center gap-4">
      <button class="inline-flex rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
              @click="modalOpen = false">
        Cancel
      </button>
      <button class="inline-flex rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90">
        Confirm
      </button>
    </div>
  </div>
</div>
```
