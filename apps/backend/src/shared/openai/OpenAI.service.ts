import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import OpenAI from 'openai';
import { openaiConfig } from '../../config/openai.config';

@Injectable()
export class OpenAIService {
	private readonly logger = new Logger(OpenAIService.name);
	private readonly client: OpenAI | null = null;

	constructor(
		@Inject(openaiConfig.KEY)
		private readonly config: ConfigType<typeof openaiConfig>,
	) {
		if (!this.config.apiKey) {
			this.logger.warn(
				'OpenAI API key not configured. AI features will be disabled.',
			);
			return;
		}

		// TypeScript workaround: reassign to mutable variable
		(this.client as OpenAI | null) = new OpenAI({
			apiKey: this.config.apiKey,
		});

		this.logger.log('OpenAI service initialized successfully');
	}

	/**
	 * Genera embeddings vectoriales para un texto dado
	 * @param text Texto para generar embedding
	 * @returns Array de números (vector de embeddings)
	 */
	async generateEmbedding(text: string): Promise<number[]> {
		if (!this.client) {
			throw new Error('OpenAI client not initialized');
		}

		try {
			this.logger.debug(`Generating embedding for text (length: ${text.length})`);

			const response = await this.client.embeddings.create({
				model: this.config.embeddingModel,
				input: text,
			});

			const embedding = response.data[0]?.embedding;
			if (!embedding) {
				throw new Error('No embedding returned from OpenAI');
			}
			this.logger.debug(`Embedding generated successfully (dimensions: ${embedding.length})`);

			return embedding;
		} catch (error) {
			this.logger.error('Error generating embedding:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to generate embedding: ${errorMessage}`);
		}
	}

	/**
	 * Genera embeddings para múltiples textos (batch processing)
	 * @param texts Array de textos
	 * @returns Array de embeddings
	 */
	async generateEmbeddings(texts: string[]): Promise<number[][]> {
		if (!this.client) {
			throw new Error('OpenAI client not initialized');
		}

		try {
			this.logger.debug(`Generating embeddings for ${texts.length} texts`);

			const response = await this.client.embeddings.create({
				model: this.config.embeddingModel,
				input: texts,
			});

			const embeddings = response.data.map((item) => item.embedding);
			this.logger.debug(`${embeddings.length} embeddings generated successfully`);

			return embeddings;
		} catch (error) {
			this.logger.error('Error generating batch embeddings:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to generate batch embeddings: ${errorMessage}`);
		}
	}

	/**
	 * Realiza una consulta al LLM con contexto (RAG)
	 * @param userQuestion Pregunta del usuario
	 * @param context Contexto de documentos relevantes
	 * @param systemPrompt Instrucciones del sistema (opcional)
	 * @returns Respuesta del LLM
	 */
	async chatCompletion(
		userQuestion: string,
		context: string,
		systemPrompt?: string,
	): Promise<string> {
		if (!this.client) {
			throw new Error('OpenAI client not initialized');
		}

		try {
			this.logger.debug('Generating chat completion with RAG context');

			const defaultSystemPrompt = `Eres un asistente legal especializado en normativa ecuatoriana.
Responde preguntas basándote ÚNICAMENTE en el contexto proporcionado.
Si la información no está en el contexto, indica que no tienes esa información.
Siempre cita las fuentes (leyes, artículos) de donde obtienes la información.
Responde de forma clara, concisa y profesional.`;

			const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
				{
					role: 'system',
					content: systemPrompt || defaultSystemPrompt,
				},
				{
					role: 'user',
					content: `Contexto:\n${context}\n\nPregunta: ${userQuestion}`,
				},
			];

			const response = await this.client.chat.completions.create({
				model: this.config.chatModel,
				messages,
				max_tokens: this.config.maxTokens,
				temperature: this.config.temperature,
			});

			const answer = response.choices[0]?.message?.content || '';
			this.logger.debug(`Chat completion generated (tokens: ${response.usage?.total_tokens})`);

			return answer;
		} catch (error) {
			this.logger.error('Error generating chat completion:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to generate chat completion: ${errorMessage}`);
		}
	}

	/**
	 * Verifica si el servicio de OpenAI está disponible
	 */
	isAvailable(): boolean {
		return !!this.client;
	}

	/**
	 * Obtiene información de configuración
	 */
	getConfig() {
		return {
			embeddingModel: this.config.embeddingModel,
			chatModel: this.config.chatModel,
			maxTokens: this.config.maxTokens,
			temperature: this.config.temperature,
			isAvailable: this.isAvailable(),
		};
	}
}
