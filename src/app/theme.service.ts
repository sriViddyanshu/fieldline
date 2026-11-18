import { Injectable } from "@angular/core";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "fieldline-theme";

@Injectable({ providedIn: "root" })
export class ThemeService {
  mode: ThemeMode = this.readSavedMode();

  constructor() {
    this.apply();
  }

  setMode(mode: ThemeMode): void {
    this.mode = mode;
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    this.apply();
  }

  private readSavedMode(): ThemeMode {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  }

  private apply(): void {
    document.documentElement.dataset["theme"] = this.mode;
    document.documentElement.style.colorScheme = this.mode;
  }
}
