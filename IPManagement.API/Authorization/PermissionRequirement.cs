using Microsoft.AspNetCore.Authorization;

namespace IPManagement.API.Authorization
{
    public class PermissionRequirement : IAuthorizationRequirement
    {
        public string Permission { get; }
        
        public PermissionRequirement(string permission)
        {
            Permission = permission;
        }
    }
}