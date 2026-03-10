using IPManagement.API.Data;
using IPManagement.API.Extensions;
using IPManagement.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace IPManagement.API.Authorization
{
    /// <summary>
    /// Handler để kiểm tra permission dựa trên RequirePermissionAttribute
    /// </summary>
    public class RequirePermissionHandler : AuthorizationHandler<RequirePermissionAttribute>
    {
        private readonly IServiceProvider _serviceProvider;

        public RequirePermissionHandler(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext authorizationContext,
            RequirePermissionAttribute requirement)
        {
            using var scope = _serviceProvider.CreateScope();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var user = await userManager.FindByNameAsync(authorizationContext.User.Identity?.Name ?? string.Empty);

            if (user == null)
                return;

            // Kiểm tra permission từ database
            var hasPermission = await userManager.HasPermissionAsync(user, requirement.Permission, context);

            if (hasPermission)
            {
                authorizationContext.Succeed(requirement);
            }
        }
    }
}