/**
 * MediaService - Serviço de persistência de mídia usando FreeImage.host
 *
 * Este serviço é responsável por garantir que as imagens enviadas ao bot
 * sejam armazenadas permanentemente, evitando que links do Discord expirem.
 */
export declare class MediaService {
    private static API_KEY;
    /**
     * Faz o upload de uma imagem para o FreeImage.host e retorna a URL direta.
     *
     * @param url - URL original da imagem (ex: do Discord)
     * @returns URL permanente da imagem ou a original em caso de falha
     */
    static persistMedia(url: string): Promise<string>;
    /**
     * Baixa o conteúdo de um anexo para processamento local.
     *
     * @param url - URL do anexo
     * @returns Buffer com os dados ou null em caso de falha
     */
    static downloadAttachment(url: string): Promise<Buffer | null>;
}
