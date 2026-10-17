import { Routes } from '@angular/router';

import { unsavedChangesGuard } from './core/services/unsaved-changes.guard';

/**
 * Admin-side routes. The list and the create/edit form are separate lazily
 * loaded screens, and the form serves both "create" and "edit" through the
 * presence (or absence) of the :id parameter.
 *
 * Both form routes are guarded: leaving a half-filled form asks for
 * confirmation instead of silently discarding the edits.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Events — Admin Console',
    loadComponent: () =>
      import('./pages/event-list/event-list').then((m) => m.EventList),
  },
  {
    path: 'events/new',
    title: 'Create Event — Admin Console',
    loadComponent: () =>
      import('./pages/event-form/event-form').then((m) => m.EventForm),
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'events/:id/edit',
    title: 'Edit Event — Admin Console',
    loadComponent: () =>
      import('./pages/event-form/event-form').then((m) => m.EventForm),
    canDeactivate: [unsavedChangesGuard],
  },
  { path: '**', redirectTo: '' },
];
