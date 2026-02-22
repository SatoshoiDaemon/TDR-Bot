import axios from 'axios';
import FormData from 'form-data';
import { logger } from '@shared/logger.js';

/**
 * MediaService - Serviço de persistência de mídia usando FreeImage.host
 * 
 * Este serviço é responsável por garantir que as imagens enviadas ao bot
 * sejam armazenadas permanentemente, evitando que links do Discord expirem.
 */
export class MediaService {
  private static API_KEY = process.env.FREEIMAGE_API_KEY || '6d207e02198a847aa98d0a2a901485a5'; // Chave default (guest) ou do .env

  /**
   * Faz o upload de uma imagem para o FreeImage.host e retorna a URL direta.
   * 
   * @param url - URL original da imagem (ex: do Discord)
   * @returns URL permanente da imagem ou a original em caso de falha
   */
  static async persistMedia(url: string): Promise<string> {
    try {
      logger.info(`[MediaService] Persistindo mídia no FreeImage.host: ${url}`);

      // 1. Baixar a imagem original
      const imageResponse = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(imageResponse.data as any);

      // 2. Preparar o FormData para a API do FreeImage.host
      const form = new FormData();
      form.append('key', MediaService.API_KEY);
      form.append('action', 'upload');
      form.append('source', buffer.toString('base64'));
      form.append('format', 'json');

      // 3. Enviar para a API
      const response = await axios.post('https://freeimage.host/api/1/upload', form, {
        headers: {
          ...form.getHeaders()
        }
      });

      if (response.data && (response.data as any).image && (response.data as any).image.url) {
        const newUrl = (response.data as any).image.url;
        logger.info(`[MediaService] Mídia persistida com sucesso: ${newUrl}`);
        return newUrl;
      }

      logger.warn('[MediaService] Resposta da API não contém URL. Usando original.');
      return url;
    } catch (error: any) {
      logger.error('[MediaService] Erro ao persistir mídia:', error.response?.data || error.message);
      // Fallback para a URL original para não quebrar o bot
      return url;
    }
  }

  /**
   * Baixa o conteúdo de um anexo para processamento local.
   * 
   * @param url - URL do anexo
   * @returns Buffer com os dados ou null em caso de falha
   */
  static async downloadAttachment(url: string): Promise<Buffer | null> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const data = response.data;
      return Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
    } catch (error) {
      logger.error(`[MediaService] Falha ao baixar anexo: ${url}`);
      return null;
    }
  }
}
