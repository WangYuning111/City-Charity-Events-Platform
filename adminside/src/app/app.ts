import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

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

  /**
   * "New event" owns the create screen. "Events" owns everything else,
   * including the edit screen — which plain routerLinkActive cannot express,
   * because /events/:id/edit is not a child route of "/".
   */
  readonly onCreateScreen = computed(() => this.url().startsWith('/events/new'));
}
