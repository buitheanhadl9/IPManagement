using System;

namespace IPManagement.API.DTOs
{
    /// <summary>
    /// DTO cho unit update notification dùng để gửi qua SignalR
    /// </summary>
    public class UnitUpdateNotificationDto
    {
        public long UnitId { get; set; }
        public string? UnitName { get; set; }
        public string Action { get; set; } = string.Empty; // "Created", "Updated", "Deleted"
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public string? UpdatedBy { get; set; }
    }
}