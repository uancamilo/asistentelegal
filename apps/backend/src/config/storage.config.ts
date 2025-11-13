import { registerAs } from '@nestjs/config';

export const storageConfig = registerAs('storage', () => ({
	type: process.env['STORAGE_TYPE'] || 'local',
	localPath: process.env['STORAGE_LOCAL_PATH'] || './uploads',
	maxFileSize: parseInt(process.env['MAX_FILE_SIZE'] || '52428800', 10), // 50MB default
	allowedMimeTypes: process.env['ALLOWED_MIME_TYPES']?.split(',') || [
		'application/pdf',
	],

	// AWS S3 (opcional)
	aws: {
		accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
		secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'],
		region: process.env['AWS_REGION'] || 'us-east-1',
		bucket: process.env['AWS_S3_BUCKET'],
	},
}));
