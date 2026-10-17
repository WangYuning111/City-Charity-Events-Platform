import { Routes } from '@angular/router';

/**
 * Admin-side routes. The list and the create/edit form are separate lazily
 * loaded screens; the form serves both "create" and "edit" through the
 * presence (or absence) of the :id parameter.
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
  },
  {
    path: 'events/:id/edit',
    title: 'Edit Event — Admin Console',
    loadComponent: () =>
      import('./pages/event-form/event-form').then((m) => m.EventForm),
  },
  { path: '**', redirectTo: '' },
];
