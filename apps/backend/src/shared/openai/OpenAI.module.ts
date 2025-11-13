import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { openaiConfig } from '../../config/openai.config';
import { OpenAIService } from './OpenAI.service';

@Module({
	imports: [ConfigModule.forFeature(openaiConfig)],
	providers: [OpenAIService],
	exports: [OpenAIService],
})
export class OpenAIModule {}
