import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly isLight = signal(false);

  constructor() {
    effect(() => {
      const body = this.document.body;
      if (!body) return;
      body.classList.toggle('theme-light', this.isLight());
    });
  }

  setLight(isLight: boolean) {
    this.isLight.set(isLight);
  }

  toggle() {
    this.isLight.update((v) => !v);
  }
}
