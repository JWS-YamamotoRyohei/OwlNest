/**
 * Utility function to conditionally join class names
 * Similar to the popular 'clsx' library
 */
export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
