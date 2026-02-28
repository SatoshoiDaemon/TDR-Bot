import { permissionsConfig } from '../config/yamlLoader.js';
export class PermissionUtils {
    /**
     * Verifica se um membro tem permissão de Staff (Moderação de RPG)
     */
    static isStaff(member) {
        // 1. Verificar se o ID do membro está na lista de staff_members
        if (permissionsConfig.staff_members?.includes(member.id)) {
            return true;
        }
        // 2. Verificar se o membro tem algum dos cargos de staff_level_roles
        if (permissionsConfig.staff_level_roles?.some(roleId => member.roles.cache.has(roleId))) {
            return true;
        }
        // 3. Verificar a permissão base (ManageRoles por padrão)
        const basePermission = (permissionsConfig.staff_level_permission || 'ManageRoles');
        if (member.permissions.has(basePermission)) {
            return true;
        }
        // 4. Administradores sempre têm acesso
        if (member.permissions.has('Administrator')) {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=permissionUtils.js.map