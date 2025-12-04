import { registerAs } from '@nestjs/config';

export const storageConfig = registerAs('storage', () => ({
	type: process.env['STORAGE_TYPE'] || 'local',
	localPath: process.env['STORAGE_LOCAL_PATH'] || './uploads',
	maxFileSize: parseInt(process.env['MAX_FILE_SIZE'] || '52428800', 10),
	allowedMimeTypes: process.env['ALLOWED_MIME_TYPES']?.split(',') || ['application/pdf'],
}));
