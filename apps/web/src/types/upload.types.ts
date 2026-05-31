export type UploadEntityType = 'TASK' | 'PROJECT' | 'USER' | 'COMMENT';

export interface UploadedFileRecord {
  id: string;
  url: string;
  signedUrl?: string;
  path: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  entityType: UploadEntityType;
  entityId: string;
  kind?: string | null;
  createdAt: string;
}
