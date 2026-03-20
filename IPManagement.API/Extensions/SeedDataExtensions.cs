using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using IPManagement.API.Data;
using IPManagement.API.Models;
using IPManagement.API;
using IPManagement.API.Authorization;

namespace IPManagement.API.Extensions;

public static class SeedDataExtensions
{
    private static async Task SeedRolePermissionsAsync(ApplicationDbContext context, ILogger logger)
    {
        // Check if already seeded with NEW format (e.g., "ip_address:view")
        // Old format is like "ip:read", new format is like "ip_address:view"
        const string newFormatIndicator = "_"; // New format uses underscore (ip_address vs ip)
        
        if (context.RolePermissions.Any() && context.RolePermissions.All(rp => rp.Permission.Contains(newFormatIndicator)))
        {
            logger.LogInformation("Role permissions already seeded with new format, skipping...");
            return;
        }

        // Clear existing permissions and migrate to new format
        if (context.RolePermissions.Any())
        {
            logger.LogInformation("Migrating from old permission format to new format...");
            context.RolePermissions.RemoveRange(context.RolePermissions);
            await context.SaveChangesAsync();
        }

        // Admin has all permissions (all function + command combinations)
        var allPermissions = PermissionHelper.GetAllPermissions();
        foreach (var permission in allPermissions)
        {
            context.RolePermissions.Add(new RolePermission { RoleName = "Admin", Permission = permission });
        }

        // Manager has full IP permissions, read-only for units/users/roles
        var managerPermissions = new[]
        {
            // IP Address - full access
            PermissionHelper.GetPermission(FunctionCode.IP_ADDRESS, CommandCode.VIEW),
            PermissionHelper.GetPermission(FunctionCode.IP_ADDRESS, CommandCode.CREATE),
            PermissionHelper.GetPermission(FunctionCode.IP_ADDRESS, CommandCode.UPDATE),
            PermissionHelper.GetPermission(FunctionCode.IP_ADDRESS, CommandCode.DELETE),
            // Unit - read only
            PermissionHelper.GetPermission(FunctionCode.UNIT, CommandCode.VIEW),
            // User - read only
            PermissionHelper.GetPermission(FunctionCode.USER, CommandCode.VIEW),
            // Role - read only
            PermissionHelper.GetPermission(FunctionCode.ROLE, CommandCode.VIEW),
            // Drawing - full access
            PermissionHelper.GetPermission(FunctionCode.DRAWING, CommandCode.VIEW),
            PermissionHelper.GetPermission(FunctionCode.DRAWING, CommandCode.CREATE),
            PermissionHelper.GetPermission(FunctionCode.DRAWING, CommandCode.UPDATE),
            PermissionHelper.GetPermission(FunctionCode.DRAWING, CommandCode.DELETE),
            // Network System - full access
            PermissionHelper.GetPermission(FunctionCode.NETWORK_SYSTEM, CommandCode.VIEW),
            PermissionHelper.GetPermission(FunctionCode.NETWORK_SYSTEM, CommandCode.CREATE),
            PermissionHelper.GetPermission(FunctionCode.NETWORK_SYSTEM, CommandCode.UPDATE),
            PermissionHelper.GetPermission(FunctionCode.NETWORK_SYSTEM, CommandCode.DELETE),
            // Transmission Channel - full access
            PermissionHelper.GetPermission(FunctionCode.TRANSMISSION_CHANNEL, CommandCode.VIEW),
            PermissionHelper.GetPermission(FunctionCode.TRANSMISSION_CHANNEL, CommandCode.CREATE),
            PermissionHelper.GetPermission(FunctionCode.TRANSMISSION_CHANNEL, CommandCode.UPDATE),
            PermissionHelper.GetPermission(FunctionCode.TRANSMISSION_CHANNEL, CommandCode.DELETE)
        };

        foreach (var permission in managerPermissions)
        {
            context.RolePermissions.Add(new RolePermission { RoleName = "Manager", Permission = permission });
        }

        // User has permissions for IP and Unit management (create, update, delete), read-only for users/roles
        var userPermissions = new[]
        {
            // IP Address - full access
            PermissionHelper.GetPermission(FunctionCode.IP_ADDRESS, CommandCode.VIEW),
            PermissionHelper.GetPermission(FunctionCode.IP_ADDRESS, CommandCode.CREATE),
            PermissionHelper.GetPermission(FunctionCode.IP_ADDRESS, CommandCode.UPDATE),
            PermissionHelper.GetPermission(FunctionCode.IP_ADDRESS, CommandCode.DELETE),
            // Unit - full access
            PermissionHelper.GetPermission(FunctionCode.UNIT, CommandCode.VIEW),
            PermissionHelper.GetPermission(FunctionCode.UNIT, CommandCode.CREATE),
            PermissionHelper.GetPermission(FunctionCode.UNIT, CommandCode.UPDATE),
            PermissionHelper.GetPermission(FunctionCode.UNIT, CommandCode.DELETE),
            // User - read only
            PermissionHelper.GetPermission(FunctionCode.USER, CommandCode.VIEW),
            // Role - read only
            PermissionHelper.GetPermission(FunctionCode.ROLE, CommandCode.VIEW),
            // Drawing - full access
            PermissionHelper.GetPermission(FunctionCode.DRAWING, CommandCode.VIEW),
            PermissionHelper.GetPermission(FunctionCode.DRAWING, CommandCode.CREATE),
            PermissionHelper.GetPermission(FunctionCode.DRAWING, CommandCode.UPDATE),
            PermissionHelper.GetPermission(FunctionCode.DRAWING, CommandCode.DELETE),
            // Network System - full access
            PermissionHelper.GetPermission(FunctionCode.NETWORK_SYSTEM, CommandCode.VIEW),
            PermissionHelper.GetPermission(FunctionCode.NETWORK_SYSTEM, CommandCode.CREATE),
            PermissionHelper.GetPermission(FunctionCode.NETWORK_SYSTEM, CommandCode.UPDATE),
            PermissionHelper.GetPermission(FunctionCode.NETWORK_SYSTEM, CommandCode.DELETE),
            // Transmission Channel - full access
            PermissionHelper.GetPermission(FunctionCode.TRANSMISSION_CHANNEL, CommandCode.VIEW),
            PermissionHelper.GetPermission(FunctionCode.TRANSMISSION_CHANNEL, CommandCode.CREATE),
            PermissionHelper.GetPermission(FunctionCode.TRANSMISSION_CHANNEL, CommandCode.UPDATE),
            PermissionHelper.GetPermission(FunctionCode.TRANSMISSION_CHANNEL, CommandCode.DELETE)
        };

        foreach (var permission in userPermissions)
        {
            context.RolePermissions.Add(new RolePermission { RoleName = "User", Permission = permission });
        }

        await context.SaveChangesAsync();
        logger.LogInformation("Seeded role permissions for Admin, Manager, and User roles using new Function+Command format");
    }

    public static async Task SeedDataAsync(this IServiceProvider serviceProvider)
    {
        using (var scope = serviceProvider.CreateScope())
        {
            var services = scope.ServiceProvider;
            var logger = services.GetRequiredService<ILogger<Program>>();
            var context = services.GetRequiredService<ApplicationDbContext>();
            var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

            try
            {
                // Migrate database
                await context.Database.MigrateAsync();

                // Seed roles
                var roles = new[] { "Admin", "Manager", "User" };
                foreach (var role in roles)
                {
                    if (!await roleManager.RoleExistsAsync(role))
                    {
                        await roleManager.CreateAsync(new IdentityRole(role));
                        logger.LogInformation($"Created role: {role}");
                    }
                }

                // Seed role permissions
                await SeedRolePermissionsAsync(context, logger);

                // Seed admin user
                var adminEmail = "admin@ipmanagement.com";
                var adminUser = await userManager.FindByEmailAsync(adminEmail);
                if (adminUser == null)
                {
                    adminUser = new ApplicationUser
                    {
                        UserName = "admin",
                        Email = adminEmail,
                        FullName = "System Administrator",
                        EmailConfirmed = true
                    };

                    var result = await userManager.CreateAsync(adminUser, "Admin@123");
                    if (result.Succeeded)
                    {
                        await userManager.AddToRoleAsync(adminUser, "Admin");
                        logger.LogInformation("Created admin user: admin@ipmanagement.com");
                    }
                }

                // Seed sample units
                if (!context.Units.Any())
                {
                    var units = new List<Unit>
                    {
                        new Unit { Name = "IT Department", Code = "IT", Description = "Information Technology" },
                        new Unit { Name = "HR Department", Code = "HR", Description = "Human Resources" },
                        new Unit { Name = "Finance Department", Code = "FIN", Description = "Finance & Accounting" },
                        new Unit { Name = "Operations", Code = "OPS", Description = "Operations Department" },
                    };

                    foreach (var unit in units)
                    {
                        context.Units.Add(unit);
                    }

                    await context.SaveChangesAsync();
                    logger.LogInformation($"Created {units.Count} sample units");
                }

                // Seed sample users for units
                var sampleUsers = new[]
                {
                    new { Username = "it.admin", Email = "it.admin@ipmanagement.com", FullName = "IT Admin", UnitName = "IT Department", Role = "Manager", Password = "User@123" },
                    new { Username = "hr.admin", Email = "hr.admin@ipmanagement.com", FullName = "HR Admin", UnitName = "HR Department", Role = "Manager", Password = "User@123" },
                    new { Username = "it.user", Email = "it.user@ipmanagement.com", FullName = "IT Staff", UnitName = "IT Department", Role = "User", Password = "User@123" },
                    new { Username = "hr.user", Email = "hr.user@ipmanagement.com", FullName = "HR Staff", UnitName = "HR Department", Role = "User", Password = "User@123" },
                };

                foreach (var userData in sampleUsers)
                {
                    var user = await userManager.FindByEmailAsync(userData.Email);
                    if (user == null)
                    {
                        var unit = await context.Units.FirstOrDefaultAsync(u => u.Name == userData.UnitName);
                        if (unit != null)
                        {
                            var newUser = new ApplicationUser
                            {
                                UserName = userData.Username,
                                Email = userData.Email,
                                FullName = userData.FullName,
                                EmailConfirmed = true
                            };

                            var result = await userManager.CreateAsync(newUser, userData.Password);
                            if (result.Succeeded)
                            {
                                await userManager.AddToRoleAsync(newUser, userData.Role);
                                
                                // Create UserUnitAssignment instead of setting UnitId
                                var assignment = new UserUnitAssignment
                                {
                                    UserId = newUser.Id,
                                    UnitId = unit.Id,
                                    Role = userData.Role == "Manager" ? "UnitAdmin" : "User",
                                    IsPrimary = true
                                };
                                await context.UserUnitAssignments.AddAsync(assignment);
                                
                                logger.LogInformation($"Created user: {userData.Email} ({userData.Role})");
                            }
                        }
                    }
                }

                // Seed sample IP addresses
                if (!context.IPAddresses.Any())
                {
                    var itUnit = await context.Units.FirstOrDefaultAsync(u => u.Name == "IT Department");
                    var hrUnit = await context.Units.FirstOrDefaultAsync(u => u.Name == "HR Department");

                    if (itUnit != null)
                    {
                        var ipAddresses = new List<IPAddressRecord>
                        {
                            new IPAddressRecord
                            {
                                UnitId = itUnit.Id,
                                IpAddress = "192.168.1.1",
                                Description = "Gateway Router",
                                Status = "Active",
                                DeviceName = "GATEWAY-01",
                                DeviceType = "Router"
                            },
                            new IPAddressRecord
                            {
                                UnitId = itUnit.Id,
                                IpAddress = "192.168.1.10",
                                Description = "Primary DNS Server",
                                Status = "Active",
                                DeviceName = "DNS-01",
                                DeviceType = "Server"
                            },
                            new IPAddressRecord
                            {
                                UnitId = itUnit.Id,
                                IpAddress = "192.168.1.20",
                                Description = "Web Server",
                                Status = "Active",
                                DeviceName = "WEB-01",
                                DeviceType = "Server"
                            },
                        };

                        context.IPAddresses.AddRange(ipAddresses);
                    }

                    if (hrUnit != null)
                    {
                        var hrIPs = new List<IPAddressRecord>
                        {
                            new IPAddressRecord
                            {
                                UnitId = hrUnit.Id,
                                IpAddress = "192.168.2.1",
                                Description = "HR Gateway",
                                Status = "Active",
                                DeviceName = "HR-GATEWAY",
                                DeviceType = "Router"
                            },
                            new IPAddressRecord
                            {
                                UnitId = hrUnit.Id,
                                IpAddress = "192.168.2.100",
                                Description = "HR Workstation 1",
                                Status = "Active",
                                DeviceName = "HR-PC-01",
                                DeviceType = "Workstation"
                            },
                        };

                        context.IPAddresses.AddRange(hrIPs);
                    }

                    await context.SaveChangesAsync();
                    logger.LogInformation("Created sample IP addresses");
                }

                logger.LogInformation("Data seeding completed successfully");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "An error occurred while seeding data");
            }
        }
    }
}
