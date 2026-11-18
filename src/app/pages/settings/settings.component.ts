import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { ThemeService, ThemeMode } from "../../theme.service";

@Component({
  selector: "fieldline-settings-page",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <header class="page-head"><div><p class="eyebrow">CONNECTIONS</p><h1>Settings</h1><p class="lede">Adjust the appearance and local preferences for this workspace.</p></div></header>
      <article class="panel theme-panel">
        <div class="panel-head"><div><h2>Appearance</h2><p>Choose the display theme for this browser.</p></div></div>
        <div class="theme-options" role="group" aria-label="Color theme">
          <button type="button" class="theme-option" [class.selected]="theme.mode === 'light'" [attr.aria-pressed]="theme.mode === 'light'" (click)="setTheme('light')"><span class="theme-preview light-preview" aria-hidden="true">☀</span><span><strong>Light</strong><small>White with Everlume orange accents</small></span></button>
          <button type="button" class="theme-option" [class.selected]="theme.mode === 'dark'" [attr.aria-pressed]="theme.mode === 'dark'" (click)="setTheme('dark')"><span class="theme-preview dark-preview" aria-hidden="true">☾</span><span><strong>Dark</strong><small>Dark surfaces with warm orange accents</small></span></button>
        </div>
        <p class="theme-note" role="status">Your preference is saved in this browser.</p>
      </article>
      <article class="panel settings-panel"><div class="panel-head"><div><h2>Workspace information</h2><p>Application and data boundaries.</p></div></div><dl class="settings-details"><div><dt>Application</dt><dd>Fieldline Asset Operations</dd></div><div><dt>Database</dt><dd>Fieldline MySQL schema</dd></div><div><dt>Appearance storage</dt><dd>This browser only</dd></div><div><dt>Default time zone</dt><dd>Local browser time</dd></div></dl></article>
    </section>
  `,
})
export class SettingsComponent {
  readonly theme = inject(ThemeService);

  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }
}
