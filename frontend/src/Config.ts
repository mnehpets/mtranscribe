/**
 * Global application configuration singleton.
 * Holds application-wide settings like the Deepgram API key.
 */
const STORAGE_KEY = 'mtranscribe-settings';

export class AppConfig {
  private static instance: AppConfig;
  public deepgramApiKey: string = '';

  private constructor() {
    this.load();
  }

  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  /**
   * Loads settings from localStorage.
   */
  load(): void {
    if (typeof localStorage === 'undefined') return;
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.deepgramApiKey) {
          this.deepgramApiKey = data.deepgramApiKey;
        }
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
  }

  /**
   * Saves current settings to localStorage.
   */
  save(): void {
    if (typeof localStorage === 'undefined') return;

    const data = {
      deepgramApiKey: this.deepgramApiKey
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}
