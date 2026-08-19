# TailAdmin: Tables and Pagination

## Tables

### Basic Table

```html
<div class="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
  <h4 class="mb-6 text-xl font-semibold text-black dark:text-white">
    Table Title
  </h4>

  <div class="flex flex-col">
    <!-- Table Header -->
    <div class="grid grid-cols-3 rounded-sm bg-gray-2 dark:bg-meta-4 sm:grid-cols-5">
      <div class="p-2.5 xl:p-5">
        <h5 class="text-sm font-medium uppercase xsm:text-base">Source</h5>
      </div>
      <div class="p-2.5 text-center xl:p-5">
        <h5 class="text-sm font-medium uppercase xsm:text-base">Visitors</h5>
      </div>
      <div class="p-2.5 text-center xl:p-5">
        <h5 class="text-sm font-medium uppercase xsm:text-base">Revenues</h5>
      </div>
      <div class="hidden p-2.5 text-center sm:block xl:p-5">
        <h5 class="text-sm font-medium uppercase xsm:text-base">Sales</h5>
      </div>
      <div class="hidden p-2.5 text-center sm:block xl:p-5">
        <h5 class="text-sm font-medium uppercase xsm:text-base">Conversion</h5>
      </div>
    </div>

    <!-- Table Rows -->
    <div class="grid grid-cols-3 border-b border-stroke dark:border-strokedark sm:grid-cols-5">
      <div class="flex items-center gap-3 p-2.5 xl:p-5">
        <div class="flex-shrink-0">
          <img src="image.jpg" alt="Brand" />
        </div>
        <p class="hidden text-black dark:text-white sm:block">Google</p>
      </div>

      <div class="flex items-center justify-center p-2.5 xl:p-5">
        <p class="text-black dark:text-white">3.5K</p>
      </div>

      <div class="flex items-center justify-center p-2.5 xl:p-5">
        <p class="text-meta-3">$5,768</p>
      </div>

      <div class="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
        <p class="text-black dark:text-white">590</p>
      </div>

      <div class="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
        <p class="text-meta-5">4.8%</p>
      </div>
    </div>
  </div>
</div>
```

### Data Table with Actions

```html
<div class="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
  <div class="py-6 px-4 md:px-6 xl:px-7.5">
    <h4 class="text-xl font-semibold text-black dark:text-white">
      Top Products
    </h4>
  </div>

  <div class="grid grid-cols-6 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-8 md:px-6 2xl:px-7.5">
    <div class="col-span-3 flex items-center">
      <p class="font-medium">Product Name</p>
    </div>
    <div class="col-span-2 hidden items-center sm:flex">
      <p class="font-medium">Category</p>
    </div>
    <div class="col-span-1 flex items-center">
      <p class="font-medium">Price</p>
    </div>
    <div class="col-span-1 flex items-center">
      <p class="font-medium">Sold</p>
    </div>
    <div class="col-span-1 flex items-center">
      <p class="font-medium">Profit</p>
    </div>
  </div>

  <!-- Row -->
  <div class="grid grid-cols-6 border-t border-stroke py-4.5 px-4 dark:border-strokedark sm:grid-cols-8 md:px-6 2xl:px-7.5">
    <div class="col-span-3 flex items-center">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div class="h-12.5 w-15 rounded-md">
          <img src="product.jpg" alt="Product" />
        </div>
        <p class="text-sm text-black dark:text-white">Apple Watch Series 7</p>
      </div>
    </div>
    <div class="col-span-2 hidden items-center sm:flex">
      <p class="text-sm text-black dark:text-white">Electronics</p>
    </div>
    <div class="col-span-1 flex items-center">
      <p class="text-sm text-black dark:text-white">$269</p>
    </div>
    <div class="col-span-1 flex items-center">
      <p class="text-sm text-black dark:text-white">22</p>
    </div>
    <div class="col-span-1 flex items-center">
      <p class="text-sm text-meta-3">$45</p>
    </div>
  </div>
</div>
```

## Pagination

```html
<div class="p-4 sm:p-6 xl:p-7.5">
  <nav>
    <ul class="flex flex-wrap items-center gap-2">
      <li>
        <a href="#" class="flex items-center justify-center rounded bg-[#EDEFF1] py-1.5 px-3 text-xs font-medium text-black hover:bg-primary hover:text-white dark:bg-graydark dark:text-white dark:hover:bg-primary dark:hover:text-white">
          Previous
        </a>
      </li>
      <li>
        <a href="#" class="flex items-center justify-center rounded py-1.5 px-3 font-medium hover:bg-primary hover:text-white">1</a>
      </li>
      <li>
        <a href="#" class="flex items-center justify-center rounded bg-primary py-1.5 px-3 font-medium text-white">2</a>
      </li>
      <li>
        <a href="#" class="flex items-center justify-center rounded py-1.5 px-3 font-medium hover:bg-primary hover:text-white">3</a>
      </li>
      <li>
        <a href="#" class="flex items-center justify-center rounded bg-[#EDEFF1] py-1.5 px-3 text-xs font-medium text-black hover:bg-primary hover:text-white dark:bg-graydark dark:text-white dark:hover:bg-primary dark:hover:text-white">
          Next
        </a>
      </li>
    </ul>
  </nav>
</div>
```
