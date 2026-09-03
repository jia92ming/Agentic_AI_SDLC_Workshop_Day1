import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Link, LinksService } from './links.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private readonly linksService = inject(LinksService);

  readonly links = signal<Link[]>([]);
  readonly url = signal('');
  readonly shortLink = signal<Link | null>(null);
  readonly error = signal('');
  readonly submitting = signal(false);

  constructor() {
    this.loadLinks();
  }

  submit(): void {
    const value = this.url().trim();
    if (!this.isValidUrl(value)) {
      this.error.set('Please enter a valid http:// or https:// URL.');
      return;
    }

    this.error.set('');
    this.shortLink.set(null);
    this.submitting.set(true);
    this.linksService.create(value).subscribe({
      next: (link) => {
        this.shortLink.set(link);
        this.url.set('');
        this.submitting.set(false);
        this.loadLinks();
      },
      error: (response) => {
        this.error.set(response.error?.error ?? 'Unable to create the short link.');
        this.submitting.set(false);
      }
    });
  }

  loadLinks(): void {
    this.linksService.list().subscribe({
      next: (links) => this.links.set(links),
      error: () => this.error.set('Unable to load links. Is the backend running?')
    });
  }

  private isValidUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
