using Microsoft.AspNetCore.SignalR;
using IPManagement.API.Hubs;

namespace IPManagement.API.Services;

/// <summary>
/// DTO cho permission update notification
/// </summary>
public class PermissionUpdateNotification
{
    public string RoleName { get; set; } = string.Empty;
    public string[] UpdatedPermissions { get; set; } = Array.Empty<string>();
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? UpdatedBy { get; set; }
}

/// <summary>
/// Interface cho permission notification service
/// </summary>
public interface IPermissionNotificationService
{
    /// <summary>
    /// Gửi notification đến tất cả user thuộc role khi permissions thay đổi
    /// </summary>
    Task NotifyPermissionsUpdatedAsync(string roleName, string[] updatedPermissions, string? updatedBy = null);
    
    /// <summary>
    /// Gửi notification đến một specific user
    /// </summary>
    Task NotifyUserAsync(string userId, string message);
}

/// <summary>
/// Service để gửi notification khi permissions thay đổi qua SignalR
/// </summary>
public class PermissionNotificationService : IPermissionNotificationService
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly ILogger<PermissionNotificationService> _logger;

    public PermissionNotificationService(
        IHubContext<NotificationHub> hubContext,
        ILogger<PermissionNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <summary>
    /// Gửi notification đến group theo roleName
    /// Client sẽ join group có tên là "role:{roleName}"
    /// </summary>
    public async Task NotifyPermissionsUpdatedAsync(string roleName, string[] updatedPermissions, string? updatedBy = null)
    {
        try
        {
            var notification = new PermissionUpdateNotification
            {
                RoleName = roleName,
                UpdatedPermissions = updatedPermissions,
                UpdatedAt = DateTime.UtcNow,
                UpdatedBy = updatedBy
            };

            // Gửi notification đến group của role
            // Group name format: "role:{roleName}"
            var groupName = $"role:{roleName}";
            await _hubContext.Clients.Group(groupName).SendAsync("PermissionsUpdated", notification);
            
            _logger.LogInformation($"Sent permissions update notification for role '{roleName}' to group '{groupName}'");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send permissions update notification for role '{RoleName}'", roleName);
        }
    }

    /// <summary>
    /// Gửi notification đến một specific user
    /// </summary>
    public async Task NotifyUserAsync(string userId, string message)
    {
        try
        {
            await _hubContext.Clients.User(userId).SendAsync("UserNotification", message);
            _logger.LogInformation($"Sent user notification to user '{userId}'");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send user notification to '{UserId}'", userId);
        }
    }
}