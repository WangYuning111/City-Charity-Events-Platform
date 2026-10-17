import { CanDeactivateFn } from '@angular/router';

/** Implemented by any component that can hold unsaved edits. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Stops a staff member from silently discarding a half-filled form.
 *
 * The check runs only when the component actually reports a dirty state, so
 * navigation after a successful save (which resets `dirty`) is never blocked.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component || typeof component.hasUnsavedChanges !== 'function') return true;
  if (!component.hasUnsavedChanges()) return true;

  return window.confirm(
    'You have unsaved changes on this form.\n\nLeave this page and discard them?'
  );
};
