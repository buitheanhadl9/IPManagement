using Microsoft.AspNetCore.Authorization;

namespace IPManagement.API.Authorization
{
    /// <summary>
    /// Attribute để yêu cầu permission cụ thể trên action methods
    /// </summary>
    [AttributeUsage(AttributeTargets.Method)]
    public class RequirePermissionAttribute : Attribute, IAuthorizationRequirement
    {
        public FunctionCode Function { get; }
        public CommandCode Command { get; }
        public string Permission { get; }

        public RequirePermissionAttribute(FunctionCode function, CommandCode command)
        {
            Function = function;
            Command = command;
            Permission = PermissionHelper.GetPermission(function, command);
        }
    }
}