/**
 * Global application configuration singleton.
 * Holds application-wide settings like the Deepgram API key.
 */
export class AppConfig {
  private static instance: AppConfig;
  public deepgramApiKey: string = '';

  private constructor() {}

  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }
}
