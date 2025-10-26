
export enum TabMode {
  EDIT = 'EDIT',
  GENERATE = 'GENERATE',
  ANALYZE = 'ANALYZE',
  VIDEO = 'VIDEO',
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface UploadedFile {
  file: File;
  preview: string;
  base64: string;
}

// Fix: Moved global declaration from geminiService.ts to have a single,
// authoritative source for the window.aistudio type, fixing declaration errors.
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
