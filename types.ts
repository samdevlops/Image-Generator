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

// Fix: Removed conflicting global declaration for window.aistudio.
// The type is assumed to be declared correctly elsewhere in the project,
// and removing this duplicate resolves compilation errors.
