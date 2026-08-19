# TailAdmin: Forms and Buttons

> **Caution.** The markup below comes from an older generation of TailAdmin. Its
> class names differ from the ones of this project. Copy the structure, and then
> map each class onto a token of `apps/frontend/src/styles.css`. Read
> `custom-configuration.md` for the map. A template under
> `apps/frontend/src/app` gives a better example than this file.

## Forms

### Input Field

```html
<div class="mb-4.5">
  <label class="mb-2.5 block text-black dark:text-white">
    Email <span class="text-meta-1">*</span>
  </label>
  <input
    type="email"
    placeholder="Enter your email address"
    class="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
  />
</div>
```

### Select Input

```html
<div class="mb-4.5">
  <label class="mb-2.5 block text-black dark:text-white">Subject</label>
  <div class="relative z-20 bg-transparent dark:bg-form-input">
    <select class="relative z-20 w-full appearance-none rounded border border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary">
      <option value="">Select subject</option>
      <option value="USA">USA</option>
      <option value="UK">UK</option>
      <option value="Canada">Canada</option>
    </select>
    <span class="absolute top-1/2 right-4 z-30 -translate-y-1/2">
      <svg class="fill-current" width="24" height="24" viewBox="0 0 24 24">
        <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2"/>
      </svg>
    </span>
  </div>
</div>
```

### Textarea

```html
<div class="mb-6">
  <label class="mb-2.5 block text-black dark:text-white">Message</label>
  <textarea
    rows="6"
    placeholder="Type your message"
    class="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
  ></textarea>
</div>
```

### Checkbox

```html
<div>
  <label class="flex cursor-pointer select-none items-center">
    <div class="relative">
      <input type="checkbox" class="sr-only" />
      <div class="box mr-4 flex h-5 w-5 items-center justify-center rounded border border-stroke dark:border-strokedark">
        <span class="opacity-0">
          <svg class="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
          </svg>
        </span>
      </div>
    </div>
    Remember me
  </label>
</div>
```

### Toggle Switch

```html
<div x-data="{ switcherToggle: false }">
  <label for="toggle1" class="flex cursor-pointer select-none items-center">
    <div class="relative">
      <input type="checkbox" id="toggle1" class="sr-only" @change="switcherToggle = !switcherToggle" />
      <div class="block h-8 w-14 rounded-full bg-meta-9 dark:bg-[#5A616B]"></div>
      <div :class="switcherToggle && '!right-1 !translate-x-full !bg-primary dark:!bg-white'" 
           class="absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition">
      </div>
    </div>
  </label>
</div>
```

## Buttons

### Primary Button

```html
<button class="flex w-full justify-center rounded bg-primary p-3 font-medium text-gray hover:bg-opacity-90">
  Sign In
</button>
```

### Secondary Button

```html
<button class="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white">
  Cancel
</button>
```

### Button with Icon

```html
<button class="inline-flex items-center justify-center gap-2.5 rounded-md bg-primary py-4 px-10 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10">
  <span>
    <svg class="fill-current" width="20" height="20" viewBox="0 0 20 20">
      <!-- Icon SVG -->
    </svg>
  </span>
  Button With Icon
</button>
```

### Button Sizes

```html
<!-- Small -->
<button class="inline-flex items-center justify-center rounded-md bg-primary py-2 px-4 text-center font-medium text-white hover:bg-opacity-90">
  Small
</button>

<!-- Medium (default) -->
<button class="inline-flex items-center justify-center rounded-md bg-primary py-3 px-6 text-center font-medium text-white hover:bg-opacity-90">
  Medium
</button>

<!-- Large -->
<button class="inline-flex items-center justify-center rounded-md bg-primary py-4 px-10 text-center font-medium text-white hover:bg-opacity-90">
  Large
</button>
```

### Status Buttons

```html
<!-- Success -->
<button class="inline-flex items-center justify-center rounded-md bg-meta-3 py-3 px-6 text-center font-medium text-white hover:bg-opacity-90">
  Success
</button>

<!-- Warning -->
<button class="inline-flex items-center justify-center rounded-md bg-warning py-3 px-6 text-center font-medium text-white hover:bg-opacity-90">
  Warning
</button>

<!-- Danger -->
<button class="inline-flex items-center justify-center rounded-md bg-danger py-3 px-6 text-center font-medium text-white hover:bg-opacity-90">
  Danger
</button>
```
