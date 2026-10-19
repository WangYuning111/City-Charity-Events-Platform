import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { PUBLIC_SITE_URL } from './core/config/api.config';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);

  /** Current URL as a signal, so the nav can highlight precisely. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  /** Path only — query strings such as ?saved=created must not affect the nav. */
  private readonly path = computed(() => this.url().split('?')[0].split('#')[0]);

  /** Public website address, so the header link follows the deployment. */
  readonly publicSiteUrl = PUBLIC_SITE_URL;

  readonly onDashboard = computed(() => this.path() === '/');
  readonly onCreate = computed(() => this.path().startsWith('/events/new'));

  /**
   * The events section owns both the list and the edit screen. Plain
   * routerLinkActive cannot express that, because /events/:id/edit is not a
   * child route of /events in any way the directive understands.
   */
  readonly onEvents = computed(() => this.path().startsWith('/events') && !this.onCreate());
}
