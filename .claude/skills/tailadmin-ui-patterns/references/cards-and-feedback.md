# TailAdmin: Cards, Badges and Alerts

## Card Components

### Basic Card

```html
<div class="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
  <h4 class="mb-6 text-xl font-semibold text-black dark:text-white">
    Card Title
  </h4>
  
  <!-- Card content -->
</div>
```

### Stats Card (KPI Card)

```html
<div class="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
  <div class="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
    <!-- Icon SVG -->
    <svg class="fill-primary dark:fill-white" width="22" height="16" viewBox="0 0 22 16">
      <!-- SVG path -->
    </svg>
  </div>

  <div class="mt-4 flex items-end justify-between">
    <div>
      <h4 class="text-title-md font-bold text-black dark:text-white">
        $3.456K
      </h4>
      <span class="text-sm font-medium">Total Views</span>
    </div>

    <span class="flex items-center gap-1 text-sm font-medium text-meta-3">
      0.43%
      <svg class="fill-meta-3" width="10" height="11" viewBox="0 0 10 11">
        <!-- Up arrow SVG -->
      </svg>
    </span>
  </div>
</div>
```

### Card with Chart

```html
<div class="col-span-12 rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-8">
  <div class="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
    <div class="flex w-full flex-wrap gap-3 sm:gap-5">
      <div class="flex min-w-47.5">
        <span class="mt-1 mr-2 flex h-4 w-full max-w-4 items-center justify-center rounded-full border border-primary">
          <span class="block h-2.5 w-full max-w-2.5 rounded-full bg-primary"></span>
        </span>
        <div class="w-full">
          <p class="font-semibold text-primary">Total Revenue</p>
          <p class="text-sm font-medium">12.04.2022 - 12.05.2022</p>
        </div>
      </div>
    </div>
    
    <div class="flex w-full max-w-45 justify-end">
      <!-- Period selector dropdown -->
    </div>
  </div>

  <!-- Chart container -->
  <div id="chartOne" class="-ml-5"></div>
</div>
```

## Badges & Tags

```html
<!-- Primary Badge -->
<span class="inline-flex rounded-full bg-primary bg-opacity-10 py-1 px-3 text-sm font-medium text-primary">
  Primary
</span>

<!-- Success Badge -->
<span class="inline-flex rounded-full bg-success bg-opacity-10 py-1 px-3 text-sm font-medium text-success">
  Paid
</span>

<!-- Warning Badge -->
<span class="inline-flex rounded-full bg-warning bg-opacity-10 py-1 px-3 text-sm font-medium text-warning">
  Pending
</span>

<!-- Danger Badge -->
<span class="inline-flex rounded-full bg-danger bg-opacity-10 py-1 px-3 text-sm font-medium text-danger">
  Unpaid
</span>
```

## Alerts

```html
<!-- Warning Alert -->
<div class="flex w-full border-l-6 border-warning bg-warning bg-opacity-[15%] px-7 py-8 shadow-md dark:bg-[#1B1B24] dark:bg-opacity-30 md:p-9">
  <div class="mr-5 flex h-9 w-9 items-center justify-center rounded-lg bg-warning bg-opacity-30">
    <svg class="h-[22px] w-[22px] fill-current text-warning">
      <!-- Warning icon -->
    </svg>
  </div>
  <div class="w-full">
    <h5 class="mb-3 text-lg font-semibold text-[#9D5425]">Attention needed</h5>
    <p class="leading-relaxed text-[#D0915C]">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    </p>
  </div>
</div>

<!-- Success Alert -->
<div class="flex w-full border-l-6 border-[#34D399] bg-[#34D399] bg-opacity-[15%] px-7 py-8 shadow-md dark:bg-[#1B1B24] dark:bg-opacity-30 md:p-9">
  <div class="mr-5 flex h-9 w-full max-w-[36px] items-center justify-center rounded-lg bg-[#34D399]">
    <svg class="h-[18px] w-[18px] fill-current text-white">
      <!-- Check icon -->
    </svg>
  </div>
  <div class="w-full">
    <h5 class="mb-3 font-semibold text-black dark:text-[#34D399]">Message Sent Successfully</h5>
    <p class="text-base leading-relaxed text-body">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    </p>
  </div>
</div>
```
