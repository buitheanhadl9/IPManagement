namespace IPManagement.API
{
    public static class Permissions
    {
        // IP Address permissions
        public const string IpCreate = "ip:create";
        public const string IpRead = "ip:read";
        public const string IpUpdate = "ip:update";
        public const string IpDelete = "ip:delete";
        
        // Unit permissions
        public const string UnitCreate = "unit:create";
        public const string UnitRead = "unit:read";
        public const string UnitUpdate = "unit:update";
        public const string UnitDelete = "unit:delete";
        
        // User permissions
        public const string UserCreate = "user:create";
        public const string UserRead = "user:read";
        public const string UserUpdate = "user:update";
        public const string UserDelete = "user:delete";
        
        // Role permissions
        public const string RoleCreate = "role:create";
        public const string RoleRead = "role:read";
        public const string RoleUpdate = "role:update";
        public const string RoleDelete = "role:delete";
        
        // Audit log permissions
        public const string AuditRead = "audit:read";
    }
}