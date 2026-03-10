namespace IPManagement.API
{
    /// <summary>
    /// Deprecated: Sử dụng PermissionHelper với FunctionCode và CommandCode thay thế
    /// Đây là legacy permissions cho backward compatibility
    /// </summary>
    [System.Obsolete("Use PermissionHelper with FunctionCode and CommandCode instead")]
    public static class Permissions
    {
        // IP Address permissions
        public const string IpCreate = "ip_address:create";
        public const string IpRead = "ip_address:view";
        public const string IpUpdate = "ip_address:update";
        public const string IpDelete = "ip_address:delete";
        
        // Unit permissions
        public const string UnitCreate = "unit:create";
        public const string UnitRead = "unit:view";
        public const string UnitUpdate = "unit:update";
        public const string UnitDelete = "unit:delete";
        
        // User permissions
        public const string UserCreate = "user:create";
        public const string UserRead = "user:view";
        public const string UserUpdate = "user:update";
        public const string UserDelete = "user:delete";
        
        // Role permissions
        public const string RoleCreate = "role:create";
        public const string RoleRead = "role:view";
        public const string RoleUpdate = "role:update";
        public const string RoleDelete = "role:delete";
        
        // Audit log permissions
        public const string AuditRead = "audit_log:view";
    }
}