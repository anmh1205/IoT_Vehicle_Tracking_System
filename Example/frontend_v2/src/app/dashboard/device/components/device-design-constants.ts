/**
 * Design System Constants for Device Page
 * Centralized design tokens for consistent styling across device components
 */

// Color Palette
export const DEVICE_COLORS = {
  // Status Colors
  status: {
    running: {
      bg: 'bg-green-500',
      bgHover: 'bg-green-600',
      text: 'text-green-600 dark:text-emerald-400',
      border: 'border-green-500',
      light: 'bg-emerald-500/10',
      medium: 'bg-emerald-500/20',
      icon: 'text-emerald-600 dark:text-emerald-400'
    },
    disconnected: {
      bg: 'bg-yellow-500',
      bgHover: 'bg-yellow-600',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-yellow-500',
      light: 'bg-amber-500/10',
      medium: 'bg-amber-500/20',
      icon: 'text-amber-600 dark:text-amber-400'
    },
    stopped: {
      bg: 'bg-red-500',
      bgHover: 'bg-red-600',
      text: 'text-red-600 dark:text-destructive',
      border: 'border-red-500',
      light: 'bg-destructive/10',
      medium: 'bg-destructive/20',
      icon: 'text-destructive dark:text-destructive'
    }
  },
  // Primary Colors
  primary: {
    bg: 'bg-blue-600',
    bgHover: 'bg-blue-700',
    text: 'text-blue-600 dark:text-primary',
    border: 'border-blue-600',
    light: 'bg-primary/10',
    medium: 'bg-primary/20',
    icon: 'text-primary dark:text-primary'
  },
  // Secondary Colors
  secondary: {
    bg: 'bg-indigo-600',
    bgHover: 'bg-indigo-700',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-600',
    light: 'bg-indigo-500/10',
    medium: 'bg-indigo-500/20',
    icon: 'text-indigo-600 dark:text-indigo-400'
  },
  // Muted Colors
  muted: {
    bg: 'bg-muted/50',
    bgHover: 'bg-muted/60',
    text: 'text-muted-foreground',
    border: 'border-border',
    light: 'bg-muted/40',
    medium: 'bg-muted/60'
  }
} as const;

// Gradient Definitions
export const DEVICE_GRADIENTS = {
  // Card Backgrounds
  card: {
    primary: 'bg-gradient-to-br from-background via-primary/5 to-primary/10',
    glass: 'bg-gradient-to-br from-background/95 via-background/90 to-background/95',
    header: 'bg-gradient-to-r from-primary/10 via-primary/5 to-primary/0',
    statsQuarter: 'bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5',
    statsTotal: 'bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10'
  },
  // Status Gradients
  status: {
    running: 'bg-gradient-to-br from-green-400 to-emerald-500',
    disconnected: 'bg-gradient-to-br from-yellow-400 to-amber-500',
    stopped: 'bg-gradient-to-br from-red-400 to-rose-500'
  },
  // Progress Bar Gradients
  progress: {
    healthy: 'bg-gradient-to-r from-green-500 to-emerald-500',
    warning: 'bg-gradient-to-r from-yellow-500 to-amber-500',
    danger: 'bg-gradient-to-r from-orange-500 to-red-500'
  }
} as const;

// Shadow Definitions
export const DEVICE_SHADOWS = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  // Custom shadows
  card: 'shadow-[0_2px_8px_rgba(0,0,0,0.08)]',
  cardHover: 'shadow-[0_8px_24px_rgba(0,0,0,0.12)]',
  icon: 'shadow-[0_2px_4px_rgba(0,0,0,0.1)]',
  stats: 'shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
} as const;

// Spacing Scale
export const DEVICE_SPACING = {
  // Padding
  card: {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6'
  },
  // Gaps
  gap: {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  },
  // Margins
  section: {
    sm: 'mb-4',
    md: 'mb-6',
    lg: 'mb-8'
  }
} as const;

// Border Radius
export const DEVICE_RADIUS = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  full: 'rounded-full',
  // Specific
  card: 'rounded-2xl',
  stats: 'rounded-xl',
  button: 'rounded-lg',
  icon: 'rounded-2xl',
  input: 'rounded-lg'
} as const;

// Animation Durations & Easings
export const DEVICE_ANIMATIONS = {
  duration: {
    fast: 'duration-150',
    normal: 'duration-200',
    slow: 'duration-300',
    slower: 'duration-500'
  },
  easing: {
    default: 'ease-in-out',
    smooth: 'ease-out',
    bounce: 'ease-in-out'
  },
  // Combined
  transition: {
    fast: 'transition-all duration-200 ease-in-out',
    normal: 'transition-all duration-300 ease-in-out',
    slow: 'transition-all duration-500 ease-in-out',
    colors: 'transition-colors duration-300 ease-in-out',
    transform: 'transition-transform duration-200 ease-out',
    shadow: 'transition-shadow duration-300 ease-in-out'
  }
} as const;

// Typography
export const DEVICE_TYPOGRAPHY = {
  // Headings
  heading: {
    h1: 'text-2xl font-bold',
    h2: 'text-xl font-bold',
    h3: 'text-lg font-semibold',
    h4: 'text-base font-semibold'
  },
  // Body
  body: {
    large: 'text-base',
    medium: 'text-sm',
    small: 'text-xs'
  },
  // Weights
  weight: {
    bold: 'font-bold',
    semibold: 'font-semibold',
    medium: 'font-medium',
    normal: 'font-normal'
  },
  // Special
  mono: 'font-mono',
  tabular: 'tabular-nums'
} as const;

// Glassmorphism Styles (dark mode compatible)
export const DEVICE_GLASS = {
  // Base glass effect
  base: 'backdrop-blur-xl bg-background/80 border border-border/50',
  // Card glass
  card: 'backdrop-blur-xl bg-card border border-border shadow-lg',
  // Header glass
  header: 'backdrop-blur-md bg-gradient-to-r from-primary/10 via-primary/5 to-primary/0 border border-primary/20'
} as const;

// Hover Effects
export const DEVICE_HOVER = {
  // Transform
  lift: 'hover:-translate-y-1',
  liftMore: 'hover:-translate-y-2',
  // Shadow
  shadow: 'hover:shadow-lg',
  shadowMore: 'hover:shadow-xl',
  // Combined
  card: 'hover:-translate-y-1 hover:shadow-xl',
  button: 'hover:scale-105 hover:shadow-md'
} as const;

// Border Definitions (dark mode compatible)
export const DEVICE_BORDERS = {
  // Card borders
  card: 'border-2 border-border/80 dark:border-border/60',
  cardHover: 'border-primary/60 dark:border-primary/40',
  // Stats borders
  stats: 'border border-primary/20 dark:border-primary/30',
  // Input borders
  input: 'border-border dark:border-border/80',
  // Header borders
  header: 'border border-primary/30 dark:border-primary/40'
} as const;

// Responsive Breakpoints (for reference)
export const DEVICE_BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const;

