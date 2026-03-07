using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using IPManagement.API.Data;
using IPManagement.API.Models;
using IPManagement.API;

namespace IPManagement.API.Extensions;

public static class SeedDataExtensions
{
    private static async Task SeedRolePermissionsAsync(ApplicationDbContext context, ILogger logger)
    {
        // Check if already seeded
        if (context.RolePermissions.Any())
        {
            logger.LogInformation("Role permissions already seeded, skipping...");
            return;
        }

        // Admin has all permissions
        var adminPermissions = new[]
        {
            Permissions.IpCreate, Permissions.IpRead, Permissions.IpUpdate, Permissions.IpDelete,
            Permissions.UnitCreate, Permissions.UnitRead, Permissions.UnitUpdate, Permissions.UnitDelete,
            Permissions.UserCreate, Permissions.UserRead, Permissions.UserUpdate, Permissions.UserDelete,
            Permissions.RoleCreate, Permissions.RoleRead, Permissions.RoleUpdate, Permissions.RoleDelete
        };

        foreach (var permission in adminPermissions)
        {
            context.RolePermissions.Add(new RolePermission { RoleName = "Admin", Permission = permission });
        }

        // Manager has IP permissions and read-only for units/users
        var managerPermissions = new[]
        {
            Permissions.IpCreate, Permissions.IpRead, Permissions.IpUpdate, Permissions.IpDelete,
            Permissions.UnitRead,
            Permissions.UserRead
        };

        foreach (var permission in managerPermissions)
        {
            context.RolePermissions.Add(new RolePermission { RoleName = "Manager", Permission = permission });
        }

        // User has read-only permissions
        var userPermissions = new[]
        {
            Permissions.IpRead, Permissions.UnitRead, Permissions.UserRead, Permissions.RoleRead
        };

        foreach (var permission in userPermissions)
        {
            context.RolePermissions.Add(new RolePermission { RoleName = "User", Permission = permission });
        }

        await context.SaveChangesAsync();
        logger.LogInformation("Seeded role permissions for Admin, Manager, and User roles");
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
                    new { Username = "it.admin", Email = "it.admin@ipmanagement.com", FullName = "IT Admin", UnitName = "IT Department", Role = "UnitAdmin", Password = "User@123" },
                    new { Username = "hr.admin", Email = "hr.admin@ipmanagement.com", FullName = "HR Admin", UnitName = "HR Department", Role = "UnitAdmin", Password = "User@123" },
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
                                UnitId = unit.Id,
                                EmailConfirmed = true
                            };

                            var result = await userManager.CreateAsync(newUser, userData.Password);
                            if (result.Succeeded)
                            {
                                await userManager.AddToRoleAsync(newUser, userData.Role);
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