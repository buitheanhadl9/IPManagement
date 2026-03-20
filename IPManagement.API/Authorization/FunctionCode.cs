namespace IPManagement.API.Authorization
{
    /// <summary>
    /// Danh sách các chức năng trong hệ thống
    /// </summary>
    public enum FunctionCode
    {
        IP_ADDRESS,      // Quản lý địa chỉ IP
        UNIT,            // Quản lý đơn vị
        USER,            // Quản lý người dùng
        ROLE,            // Quản lý vai trò
        AUDIT_LOG,       // Xem nhật ký audit
        REPORT,          // Báo cáo
        SETTINGS,        // Cài đặt hệ thống
        DRAWING,         // Quản lý bản vẽ
        NETWORK_SYSTEM,  // Quản lý hệ thống mạng
        TRANSMISSION_CHANNEL  // Quản lý kênh truyền
    }
}