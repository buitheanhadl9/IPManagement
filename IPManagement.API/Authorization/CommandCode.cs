namespace IPManagement.API.Authorization
{
    /// <summary>
    /// Danh sách các hành động có thể thực hiện
    /// </summary>
    public enum CommandCode
    {
        VIEW,            // Xem
        CREATE,          // Tạo mới
        UPDATE,          // Sửa
        DELETE,          // Xóa
        EXPORT,          // Xuất dữ liệu
        IMPORT,          // Nhập dữ liệu
        APPROVE,         // Duyệt
        REJECT           // Từ chối
    }
}