import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { storageConfig } from '../../config/storage.config';
import { LocalFileStorageService } from './LocalFileStorage.service';

@Module({
	imports: [ConfigModule.forFeature(storageConfig)],
	providers: [LocalFileStorageService],
	exports: [LocalFileStorageService],
})
export class StorageModule {}
