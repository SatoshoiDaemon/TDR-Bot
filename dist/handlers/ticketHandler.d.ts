import { Interaction } from 'discord.js';
/**
 * Handler de interações do sistema de tickets
 */
export declare class TicketInteractionHandler {
    /**
     * Processa interação relacionada a tickets
     */
    static handle(interaction: Interaction): Promise<boolean>;
    /**
     * Abre ticket via botão
     */
    private static handleOpenTicket;
    /**
     * Abre ticket via select menu
     */
    private static handleOpenTicketSelect;
    /**
     * Processa modal de abertura de ticket
     */
    private static handleTicketModal;
    /**
     * Staff assume o ticket
     */
    private static handleClaim;
    /**
     * Fecha o ticket
     */
    private static handleClose;
    /**
     * Confirma fechamento do ticket
     */
    private static handleConfirmClose;
    /**
     * Cancela fechamento do ticket
     */
    private static handleCancelClose;
    /**
     * Modal de fechamento com motivo
     */
    private static handleCloseModal;
    /**
     * Usuário sai do ticket
     */
    private static handleLeave;
    /**
     * Mostra painel de staff
     */
    private static showStaffPanel;
    /**
     * Mostra painel de membro
     */
    private static showMemberPanel;
    /**
     * Processa ação do staff
     */
    private static handleStaffAction;
    /**
     * Processa ação do membro
     */
    private static handleMemberAction;
    /**
     * Adiciona usuário ao ticket
     */
    private static handleAddUser;
    /**
     * Remove usuário do ticket
     */
    private static handleRemoveUser;
    /**
     * Mostra modal de avaliação
     */
    private static showRatingModal;
    /**
     * Processa avaliação
     */
    private static handleRatingModal;
    /**
     * Processa modal de criação de painel
     */
    private static handlePanelCreateModal;
    /**
     * Processa modal de adicionar opção ao painel
     */
    private static handlePanelAddOptionModal;
}
