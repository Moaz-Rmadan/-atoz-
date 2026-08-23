import { supabase } from '../../../lib/supabase';
import { AppRole, AppPermission, UserProfile } from '../../../types/auth';

export interface SystemRole {
  id: string;
  name: AppRole;
  description_ar: string;
  created_at?: string;
}

export interface SystemPermission {
  id: string;
  code: AppPermission;
  module: string;
  description_ar: string;
  created_at?: string;
}

export interface UserRoleDetail {
  profile_id: string;
  role_id: string;
  role_name: AppRole;
  assigned_at: string;
}

export interface UserWithRoles {
  id: string;
  full_name: string;
  phone_number: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  roles: SystemRole[];
  permissions: SystemPermission[];
}

export const roleService = {
  /**
   * Fetch all system roles
   */
  async getAllRoles(): Promise<SystemRole[]> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching roles:', error);
      throw new Error('حدث خطأ أثناء جلب قائمة الأدوار.');
    }

    return (data || []).map((r) => ({
      id: r.id,
      name: r.name as AppRole,
      description_ar: r.description_ar,
      created_at: r.created_at,
    }));
  },

  /**
   * Fetch all system permissions
   */
  async getAllPermissions(): Promise<SystemPermission[]> {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('module');

    if (error) {
      console.error('Error fetching permissions:', error);
      throw new Error('حدث خطأ أثناء جلب قائمة الصلاحيات.');
    }

    return (data || []).map((p) => ({
      id: p.id,
      code: p.code as AppPermission,
      module: p.module,
      description_ar: p.description_ar,
      created_at: p.created_at,
    }));
  },

  /**
   * Fetch permission IDs assigned to a specific role
   */
  async getRolePermissionIds(roleId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', roleId);

    if (error) {
      console.error('Error fetching role permissions:', error);
      throw new Error('حدث خطأ أثناء جلب صلاحيات الدور.');
    }

    return (data || []).map((rp) => rp.permission_id);
  },

  /**
   * Fetch all users with their assigned roles and permissions (Admin function)
   */
  async getAllUsersWithRoles(): Promise<UserWithRoles[]> {
    // 1. Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles for admin:', profilesError);
      throw new Error('حدث خطأ أثناء جلب بيانات المستخدمين.');
    }

    // 2. Fetch all user_roles with role details
    const { data: userRolesData, error: urError } = await supabase
      .from('user_roles')
      .select('profile_id, role_id, roles(id, name, description_ar)');

    if (urError) {
      console.error('Error fetching user roles:', urError);
    }

    // 3. Fetch all role_permissions with permissions
    const { data: rolePermissionsData, error: rpError } = await supabase
      .from('role_permissions')
      .select('role_id, permissions(id, code, module, description_ar)');

    if (rpError) {
      console.error('Error fetching role permissions:', rpError);
    }

    // Map role_id to list of SystemPermission
    const rolePermissionsMap = new Map<string, SystemPermission[]>();
    (rolePermissionsData || []).forEach((rp: any) => {
      if (rp.role_id && rp.permissions) {
        const existing = rolePermissionsMap.get(rp.role_id) || [];
        existing.push({
          id: rp.permissions.id,
          code: rp.permissions.code as AppPermission,
          module: rp.permissions.module,
          description_ar: rp.permissions.description_ar,
        });
        rolePermissionsMap.set(rp.role_id, existing);
      }
    });

    // Map profile_id to user roles and permissions
    const userRolesMap = new Map<string, SystemRole[]>();
    const userPermissionsMap = new Map<string, Set<SystemPermission>>();

    (userRolesData || []).forEach((ur: any) => {
      if (ur.profile_id && ur.roles) {
        const roleObj: SystemRole = {
          id: ur.roles.id,
          name: ur.roles.name as AppRole,
          description_ar: ur.roles.description_ar,
        };
        const existingRoles = userRolesMap.get(ur.profile_id) || [];
        existingRoles.push(roleObj);
        userRolesMap.set(ur.profile_id, existingRoles);

        // Add permissions associated with this role
        const rolePerms = rolePermissionsMap.get(ur.roles.id) || [];
        const existingPermSet = userPermissionsMap.get(ur.profile_id) || new Set<SystemPermission>();
        rolePerms.forEach((p) => existingPermSet.add(p));
        userPermissionsMap.set(ur.profile_id, existingPermSet);
      }
    });

    return (profiles || []).map((prof) => ({
      id: prof.id,
      full_name: prof.full_name,
      phone_number: prof.phone_number,
      avatar_url: prof.avatar_url,
      is_active: prof.is_active,
      created_at: prof.created_at,
      roles: userRolesMap.get(prof.id) || [],
      permissions: Array.from(userPermissionsMap.get(prof.id) || []),
    }));
  },

  /**
   * Assign a role to a user profile
   */
  async assignRoleToUser(profileId: string, roleName: AppRole): Promise<void> {
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (roleError || !roleData) {
      throw new Error(`الدور ${roleName} غير موجود بالنظام.`);
    }

    const { error: insertError } = await supabase.from('user_roles').insert({
      profile_id: profileId,
      role_id: roleData.id,
    });

    if (insertError && !insertError.message.includes('duplicate key')) {
      throw new Error(`تعذر منح الدور للمستخدم: ${insertError.message}`);
    }
  },

  /**
   * Remove a role from a user profile
   */
  async removeRoleFromUser(profileId: string, roleName: AppRole): Promise<void> {
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (roleError || !roleData) {
      throw new Error(`الدور ${roleName} غير موجود بالنظام.`);
    }

    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('profile_id', profileId)
      .eq('role_id', roleData.id);

    if (deleteError) {
      throw new Error(`تعذر سحب الدور من المستخدم: ${deleteError.message}`);
    }
  },

  /**
   * Toggle role assignment for a user
   */
  async toggleUserRole(profileId: string, roleName: AppRole, hasRole: boolean): Promise<void> {
    if (hasRole) {
      await this.removeRoleFromUser(profileId, roleName);
    } else {
      await this.assignRoleToUser(profileId, roleName);
    }
  },

  /**
   * Assign a permission to a role
   */
  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    const { error } = await supabase.from('role_permissions').insert({
      role_id: roleId,
      permission_id: permissionId,
    });

    if (error && !error.message.includes('duplicate key')) {
      throw new Error(`تعذر إضافة الصلاحية للدور: ${error.message}`);
    }
  },

  /**
   * Remove a permission from a role
   */
  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permissionId);

    if (error) {
      throw new Error(`تعذر حذف الصلاحية من الدور: ${error.message}`);
    }
  },

  /**
   * Toggle permission for a role
   */
  async toggleRolePermission(roleId: string, permissionId: string, isAssigned: boolean): Promise<void> {
    if (isAssigned) {
      await this.removePermissionFromRole(roleId, permissionId);
    } else {
      await this.assignPermissionToRole(roleId, permissionId);
    }
  },

  /**
   * Activate or deactivate user profile
   */
  async toggleUserActiveStatus(profileId: string, newActiveState: boolean): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newActiveState, updated_at: new Date().toISOString() })
      .eq('id', profileId);

    if (error) {
      throw new Error(`تعذر تغيير حالة الحساب: ${error.message}`);
    }
  },
};
