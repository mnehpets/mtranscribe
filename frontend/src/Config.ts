/**
 * Global application configuration singleton.
 * Manages application-wide settings such as API keys.
 */
export class AppConfig {
  private static instance: AppConfig;
  public deepgramApiKey: string = '';

  private constructor() {}

  /**
   * Get the singleton instance of AppConfig.
   */
  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }
}
