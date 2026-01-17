declare module 'next/headers' {
  export type CookieValue = { name: string; value: string };

  export function cookies(): {
    get: (name: string) => CookieValue | undefined;
    set: (
      name: string,
      value: string,
      options?: {
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'strict' | 'lax' | 'none';
        maxAge?: number;
        path?: string;
      }
    ) => void;
    delete?: (name: string, options?: { path?: string }) => void;
  };

  export function headers(): Record<string, string>;
}
