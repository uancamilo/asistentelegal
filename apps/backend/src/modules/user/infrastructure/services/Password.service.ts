import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  /**
   * Hashea una contraseña usando Argon2
   */
  async hash(plainPassword: string): Promise<string> {
    return await argon2.hash(plainPassword, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });
  }

  /**
   * Verifica si una contraseña coincide con su hash
   */
  async verify(hash: string, plainPassword: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainPassword);
    } catch {
      // Si el hash es inválido, retornar false en lugar de lanzar error
      return false;
    }
  }
}
