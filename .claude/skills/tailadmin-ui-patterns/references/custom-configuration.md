# TailAdmin: Custom Configuration

## TailAdmin Custom Tailwind Configuration

**IMPORTANT**: These custom classes are defined in `tailwind.config.js`. Always verify before using:

```bash
# View the full Tailwind config to see ALL custom values
cat /tmp/tailadmin/tailwind.config.js
```

### Custom Colors (from tailwind.config.js)

```javascript
// Verify with: grep -A 100 'colors:' /tmp/tailadmin/tailwind.config.js
colors: {
  current: 'currentColor',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#1C2434',
  'black-2': '#010101',
  body: '#64748B',
  bodydark: '#AEB7C0',
  bodydark1: '#DEE4EE',
  bodydark2: '#8A99AF',
  primary: '#3C50E0',
  secondary: '#80CAEE',
  stroke: '#E2E8F0',
  gray: '#EFF4FB',
  graydark: '#333A48',
  'gray-2': '#F7F9FC',
  'gray-3': '#FAFAFA',
  whiten: '#F1F5F9',
  whiter: '#F5F7FD',
  boxdark: '#24303F',
  'boxdark-2': '#1A222C',
  strokedark: '#2E3A47',
  'form-strokedark': '#3d4d60',
  'form-input': '#1d2a39',
  'meta-1': '#DC3545',
  'meta-2': '#EFF2F7',
  'meta-3': '#10B981',
  'meta-4': '#313D4A',
  'meta-5': '#259AE6',
  'meta-6': '#FFBA00',
  'meta-7': '#FF6766',
  'meta-8': '#F0950C',
  'meta-9': '#E5E7EB',
  'meta-10': '#0FADCF',
  success: '#219653',
  danger: '#D34053',
  warning: '#FFA70B',
}
```

### Custom Spacing (from tailwind.config.js)

```javascript
// Verify with: grep -A 50 'spacing:' /tmp/tailadmin/tailwind.config.js
// Or check extend section
spacing: {
  '4.5': '1.125rem',   // 18px
  '5.5': '1.375rem',   // 22px
  '6.5': '1.625rem',   // 26px
  '7.5': '1.875rem',   // 30px
  '8.5': '2.125rem',   // 34px
  '9.5': '2.375rem',   // 38px
  '10.5': '2.625rem',  // 42px
  '11': '2.75rem',     // 44px
  '11.5': '2.875rem',  // 46px
  '12.5': '3.125rem',  // 50px
  '13': '3.25rem',     // 52px
  '14': '3.5rem',      // 56px
  '15': '3.75rem',     // 60px
  '16': '4rem',        // 64px
  '17': '4.25rem',     // 68px
  '18': '4.5rem',      // 72px
  '19': '4.75rem',     // 76px
  '21': '5.25rem',     // 84px
  '22': '5.5rem',      // 88px
  '22.5': '5.625rem',  // 90px
  '25': '6.25rem',     // 100px
  '27': '6.75rem',     // 108px
  '29': '7.25rem',     // 116px
  '30': '7.5rem',      // 120px
  '35': '8.75rem',     // 140px
  '45': '11.25rem',    // 180px
  '46': '11.5rem',     // 184px
  '54': '13.5rem',     // 216px
  '55': '13.75rem',    // 220px
  '60': '15rem',       // 240px
  '65': '16.25rem',    // 260px
  '70': '17.5rem',     // 280px
  '72.5': '18.125rem', // 290px - Sidebar width
  '90': '22.5rem',     // 360px
  '125': '31.25rem',   // 500px
  '142.5': '35.625rem',// 570px - Modal width
  '180': '45rem',      // 720px
  '203': '50.75rem',   // 812px
  '230': '57.5rem',    // 920px
}
```

### Custom Shadows

```javascript
// Verify with: grep -A 20 'boxShadow:' /tmp/tailadmin/tailwind.config.js
boxShadow: {
  default: '0px 8px 13px -3px rgba(0, 0, 0, 0.07)',
  card: '0px 1px 3px rgba(0, 0, 0, 0.12)',
  'card-2': '0px 1px 2px rgba(0, 0, 0, 0.05)',
  switcher: '0px 2px 4px rgba(0, 0, 0, 0.2), inset 0px 2px 2px #FFFFFF, inset 0px -1px 1px rgba(0, 0, 0, 0.1)',
  'switch-1': '0px 0px 5px rgba(0, 0, 0, 0.15)',
  1: '0px 1px 3px rgba(0, 0, 0, 0.08)',
  2: '0px 1px 4px rgba(0, 0, 0, 0.12)',
  3: '0px 1px 5px rgba(0, 0, 0, 0.14)',
  4: '0px 4px 10px rgba(0, 0, 0, 0.12)',
  5: '0px 1px 1px rgba(0, 0, 0, 0.15)',
  6: '0px 3px 15px rgba(0, 0, 0, 0.1)',
  7: '-5px 0 0 #313D4A, 5px 0 0 #313D4A',
  8: '1px 0 0 #313D4A, -1px 0 0 #313D4A, 0 1px 0 #313D4A, 0 -1px 0 #313D4A, 0 3px 13px rgb(0 0 0 / 8%)',
}

// Drop shadows
dropShadow: {
  1: '0px 1px 0px #E2E8F0',
  2: '0px 1px 4px rgba(0, 0, 0, 0.12)',
}
```

## Custom TailAdmin Classes Reference

These are custom classes defined in TailAdmin's CSS that extend Tailwind:

### Custom Widths
```
w-72.5      # Sidebar width
max-w-142.5 # Modal max width
max-w-45    # Dropdown width
w-15        # Small image width
h-11.5      # Icon container height
```

### Custom Spacing
```
py-7.5, px-7.5  # Card padding
gap-7.5         # Larger gaps
pb-2.5          # Table padding
mt-5.5          # Modal spacing
```

### Custom Colors
```
bg-boxdark       # Dark mode background (#24303F)
bg-boxdark-2     # Darker background (#1A222C)
bg-strokedark    # Dark mode borders
bg-graydark      # Gray dark variant
bg-meta-1        # Red notification
bg-meta-2        # Icon background
bg-meta-3        # Success green
bg-meta-4        # Active state dark
bg-meta-5        # Info blue
bg-whiter        # Off-white
text-bodydark    # Dark mode body text
text-bodydark1   # Lighter body text
text-bodydark2   # Menu section headers
border-stroke    # Light borders
border-strokedark # Dark borders
```

### Custom Drop Shadows
```
drop-shadow-1    # Header shadow
shadow-default   # Card shadow
shadow-2         # Inner header shadow
```
