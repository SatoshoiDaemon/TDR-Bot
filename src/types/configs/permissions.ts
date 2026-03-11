/**
 * Interface de Configuração de Permissões
 * Corresponde a: config/permissions.yml
 */

export interface PermissionsConfig {
    staff_level_permission: string;
    staff_members: string[];
    staff_level_roles: string[];
}
