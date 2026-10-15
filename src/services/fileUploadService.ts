import { getSupabase } from '../lib/supabase';
import { loggerService } from './loggerService';

export interface UploadOptions {
  bucket: 'profiles' | 'safaricardimage';
  maxSizeMB?: number;
  allowedExtensions?: string[];
}

export class FileUploadService {
  /**
   * Upload file to Supabase Storage Bucket
   */
  static async uploadFile(file: File, options: UploadOptions): Promise<string | null> {
    const maxSize = (options.maxSizeMB || 5) * 1024 * 1024;
    if (file.size > maxSize) {
      loggerService.warn('FileUpload', `File size exceeds ${options.maxSizeMB || 5}MB: ${file.name}`);
      throw new Error(`حجم الملف يجب ألا يتجاوز ${options.maxSizeMB || 5} ميجابايت`);
    }

    if (options.allowedExtensions && options.allowedExtensions.length > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !options.allowedExtensions.includes(ext)) {
        throw new Error(`نوع الملف غير مسموح. المسموح: ${options.allowedExtensions.join(', ')}`);
      }
    }

    try {
      const supabase = (window as any).getAuthenticatedSupabase
        ? (window as any).getAuthenticatedSupabase()
        : getSupabase();

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from(options.bucket)
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (error) {
        loggerService.error('FileUpload', 'Storage upload error', error);
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from(options.bucket)
        .getPublicUrl(data.path);

      loggerService.info('FileUpload', 'File uploaded successfully', publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
    } catch (err: any) {
      loggerService.error('FileUpload', 'Upload failed', err.message || err);
      throw err;
    }
  }

  /**
   * Parse CSV file text content into array of code strings
   */
  static parseCsvContent(content: string): string[] {
    if (!content || !content.trim()) return [];

    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const codes: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header line if detected
      if (i === 0 && (
        line.includes('كود') || 
        line.includes('الكرت') || 
        line.toLowerCase().includes('code') || 
        line.toLowerCase().includes('card')
      )) {
        continue;
      }

      const parts = line.split(/[,;\t]/).map(p => p.trim()).filter(Boolean);
      if (parts.length > 0 && parts[0]) {
        codes.push(parts[0]);
      }
    }

    return Array.from(new Set(codes)); // Deduplicate
  }
}
