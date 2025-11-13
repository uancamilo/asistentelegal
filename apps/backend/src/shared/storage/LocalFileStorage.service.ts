import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { storageConfig } from '../../config/storage.config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface UploadedFile {
	fileName: string;
	originalName: string;
	mimeType: string;
	size: number;
	path: string;
	hash: string;
}

@Injectable()
export class LocalFileStorageService {
	private readonly logger = new Logger(LocalFileStorageService.name);
	private readonly uploadPath: string;

	constructor(
		@Inject(storageConfig.KEY)
		private readonly config: ConfigType<typeof storageConfig>,
	) {
		this.uploadPath = path.resolve(this.config.localPath);
		this.ensureUploadDirectory();
	}

	/**
	 * Asegura que el directorio de uploads exista
	 */
	private async ensureUploadDirectory(): Promise<void> {
		try {
			await fs.access(this.uploadPath);
			this.logger.log(`Upload directory exists: ${this.uploadPath}`);
		} catch {
			await fs.mkdir(this.uploadPath, { recursive: true });
			this.logger.log(`Upload directory created: ${this.uploadPath}`);
		}
	}

	/**
	 * Calcula el hash SHA-256 de un archivo
	 */
	private async calculateFileHash(filePath: string): Promise<string> {
		const fileBuffer = await fs.readFile(filePath);
		const hashSum = crypto.createHash('sha256');
		hashSum.update(fileBuffer);
		return hashSum.digest('hex');
	}

	/**
	 * Genera un nombre único para el archivo
	 */
	private generateUniqueFileName(originalName: string): string {
		const timestamp = Date.now();
		const randomString = crypto.randomBytes(8).toString('hex');
		const extension = path.extname(originalName);
		const baseName = path.basename(originalName, extension);
		return `${baseName}-${timestamp}-${randomString}${extension}`;
	}

	/**
	 * Guarda un archivo en el sistema local
	 * @param file Información del archivo (Multer Express.File)
	 * @param subDirectory Subdirectorio opcional (ej: 'documents')
	 */
	async saveFile(
		file: Express.Multer.File,
		subDirectory?: string,
	): Promise<UploadedFile> {
		try {
			// Crear subdirectorio si se especifica
			const targetDir = subDirectory
				? path.join(this.uploadPath, subDirectory)
				: this.uploadPath;

			await fs.mkdir(targetDir, { recursive: true });

			// Generar nombre único
			const uniqueFileName = this.generateUniqueFileName(file.originalname);
			const filePath = path.join(targetDir, uniqueFileName);

			// Guardar archivo
			await fs.writeFile(filePath, file.buffer);

			// Calcular hash
			const fileHash = await this.calculateFileHash(filePath);

			this.logger.log(`File saved successfully: ${uniqueFileName}`);

			return {
				fileName: uniqueFileName,
				originalName: file.originalname,
				mimeType: file.mimetype,
				size: file.size,
				path: filePath,
				hash: fileHash,
			};
		} catch (error) {
			this.logger.error('Error saving file:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to save file: ${errorMessage}`);
		}
	}

	/**
	 * Obtiene un archivo del storage
	 */
	async getFile(filePath: string): Promise<Buffer> {
		try {
			return await fs.readFile(filePath);
		} catch (error) {
			this.logger.error(`Error reading file ${filePath}:`, error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to read file: ${errorMessage}`);
		}
	}

	/**
	 * Elimina un archivo del storage
	 */
	async deleteFile(filePath: string): Promise<void> {
		try {
			await fs.unlink(filePath);
			this.logger.log(`File deleted: ${filePath}`);
		} catch (error) {
			this.logger.error(`Error deleting file ${filePath}:`, error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to delete file: ${errorMessage}`);
		}
	}

	/**
	 * Verifica si un archivo existe
	 */
	async fileExists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Obtiene el tamaño de un archivo
	 */
	async getFileSize(filePath: string): Promise<number> {
		const stats = await fs.stat(filePath);
		return stats.size;
	}

	/**
	 * Valida que un archivo sea permitido según la configuración
	 */
	isAllowedFileType(mimeType: string): boolean {
		return this.config.allowedMimeTypes.includes(mimeType);
	}

	/**
	 * Valida el tamaño del archivo
	 */
	isAllowedFileSize(size: number): boolean {
		return size <= this.config.maxFileSize;
	}
}
