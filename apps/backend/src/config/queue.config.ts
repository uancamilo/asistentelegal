import { registerAs } from '@nestjs/config';

export const queueConfig = registerAs('queue', () => ({
	redis: {
		url: process.env['REDIS_URL'],
		host: process.env['REDIS_HOST'] || 'localhost',
		port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
	},
	pdfProcessing: {
		concurrency: parseInt(process.env['QUEUE_PDF_CONCURRENCY'] || '2', 10),
		maxRetries: parseInt(process.env['QUEUE_MAX_RETRIES'] || '3', 10),
	},
}));
