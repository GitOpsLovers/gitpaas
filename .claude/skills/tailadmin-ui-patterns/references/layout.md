# TailAdmin: Layout, Sidebar and Header

## Layout Structure

### Main Layout Wrapper

```html
<!-- Main container with dark mode support -->
<div class="flex h-screen overflow-hidden">
  <!-- Sidebar -->
  <aside class="absolute left-0 top-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0">
    <!-- Sidebar content -->
  </aside>

  <!-- Content Area -->
  <div class="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
    <!-- Header -->
    <header class="sticky top-0 z-999 flex w-full bg-white drop-shadow-1 dark:bg-boxdark dark:drop-shadow-none">
      <!-- Header content -->
    </header>

    <!-- Main Content -->
    <main>
      <div class="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        <!-- Page content -->
      </div>
    </main>
  </div>
</div>
```

### Page Header / Breadcrumb

```html
<!-- Breadcrumb -->
<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <h2 class="text-title-md2 font-semibold text-black dark:text-white">
    Page Title
  </h2>

  <nav>
    <ol class="flex items-center gap-2">
      <li>
        <a class="font-medium" href="index.html">Dashboard /</a>
      </li>
      <li class="font-medium text-primary">Current Page</li>
    </ol>
  </nav>
</div>
```

## Sidebar Navigation

```html
<aside class="absolute left-0 top-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0">
  <!-- Logo -->
  <div class="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
    <a href="index.html">
      <img src="logo.svg" alt="Logo" />
    </a>
  </div>

  <!-- Menu -->
  <div class="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
    <nav class="mt-5 py-4 px-4 lg:mt-9 lg:px-6">
      <div>
        <h3 class="mb-4 ml-4 text-sm font-semibold text-bodydark2">MENU</h3>

        <ul class="mb-6 flex flex-col gap-1.5">
          <!-- Menu Item -->
          <li>
            <a href="index.html"
               class="group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4"
               :class="{ 'bg-graydark dark:bg-meta-4': page === 'dashboard' }">
              <svg class="fill-current" width="18" height="18" viewBox="0 0 18 18">
                <!-- Dashboard icon -->
              </svg>
              Dashboard
            </a>
          </li>

          <!-- Dropdown Menu Item -->
          <li>
            <a href="#"
               class="group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4"
               @click.prevent="selected = (selected === 'Forms' ? '' : 'Forms')">
              <svg class="fill-current" width="18" height="18" viewBox="0 0 18 18">
                <!-- Forms icon -->
              </svg>
              Forms
              <svg class="absolute right-4 top-1/2 -translate-y-1/2 fill-current"
                   :class="{ 'rotate-180': selected === 'Forms' }"
                   width="20" height="20" viewBox="0 0 20 20">
                <!-- Chevron icon -->
              </svg>
            </a>

            <!-- Dropdown Menu -->
            <div class="overflow-hidden" :class="selected === 'Forms' ? 'block' : 'hidden'">
              <ul class="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                <li>
                  <a href="form-elements.html"
                     class="group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white">
                    Form Elements
                  </a>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </div>
    </nav>
  </div>
</aside>
```

## Header

```html
<header class="sticky top-0 z-999 flex w-full bg-white drop-shadow-1 dark:bg-boxdark dark:drop-shadow-none">
  <div class="flex flex-grow items-center justify-between py-4 px-4 shadow-2 md:px-6 2xl:px-11">
    <!-- Hamburger (mobile) -->
    <div class="flex items-center gap-2 sm:gap-4 lg:hidden">
      <button class="z-99999 block rounded-sm border border-stroke bg-white p-1.5 shadow-sm dark:border-strokedark dark:bg-boxdark lg:hidden">
        <!-- Menu icon -->
      </button>
    </div>

    <!-- Search -->
    <div class="hidden sm:block">
      <form action="#">
        <div class="relative">
          <button class="absolute top-1/2 left-0 -translate-y-1/2">
            <svg class="fill-body hover:fill-primary dark:fill-bodydark dark:hover:fill-primary" width="20" height="20">
              <!-- Search icon -->
            </svg>
          </button>
          <input type="text" placeholder="Type to search..."
                 class="w-full bg-transparent pr-4 pl-9 focus:outline-none" />
        </div>
      </form>
    </div>

    <!-- Right Side -->
    <div class="flex items-center gap-3 2xsm:gap-7">
      <!-- Dark Mode Toggle -->
      <div class="flex items-center gap-4">
        <!-- Theme toggler -->
      </div>

      <!-- Notification -->
      <div class="relative" x-data="{ dropdownOpen: false }">
        <a href="#" class="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-stroke bg-gray hover:text-primary dark:border-strokedark dark:bg-meta-4 dark:text-white">
          <span class="absolute -top-0.5 right-0 z-1 h-2 w-2 rounded-full bg-meta-1">
            <span class="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75"></span>
          </span>
          <svg class="fill-current duration-300 ease-in-out" width="18" height="18">
            <!-- Bell icon -->
          </svg>
        </a>
        <!-- Dropdown -->
      </div>

      <!-- User Dropdown -->
      <div class="relative" x-data="{ dropdownOpen: false }">
        <a href="#" class="flex items-center gap-4" @click.prevent="dropdownOpen = !dropdownOpen">
          <span class="hidden text-right lg:block">
            <span class="block text-sm font-medium text-black dark:text-white">Thomas Anree</span>
            <span class="block text-xs">UX Designer</span>
          </span>
          <span class="h-12 w-12 rounded-full">
            <img src="user.jpg" alt="User" />
          </span>
        </a>
        <!-- Dropdown content -->
      </div>
    </div>
  </div>
</header>
```
