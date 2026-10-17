import { Routes } from '@angular/router';

import { unsavedChangesGuard } from './core/services/unsaved-changes.guard';

/**
 * Admin-side routes.
 *
 *   /                 overview dashboard (entry point)
 *   /events           full catalogue, every status
 *   /events/new       create form
 *   /events/:id/edit  edit form + that event's registrations
 *
 * Both form routes are guarded: leaving a half-filled form asks for
 * confirmation instead of silently discarding the edits.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Dashboard — Admin Console',
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'events',
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
