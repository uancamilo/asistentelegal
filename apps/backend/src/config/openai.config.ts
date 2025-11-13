import { registerAs } from '@nestjs/config';

export const openaiConfig = registerAs('openai', () => ({
	apiKey: process.env['OPENAI_API_KEY'],
	embeddingModel:
		process.env['OPENAI_EMBEDDING_MODEL'] || 'text-embedding-ada-002',
	chatModel: process.env['OPENAI_CHAT_MODEL'] || 'gpt-3.5-turbo',
	maxTokens: parseInt(process.env['OPENAI_MAX_TOKENS'] || '1000', 10),
	temperature: parseFloat(process.env['OPENAI_TEMPERATURE'] || '0.7'),
}));
