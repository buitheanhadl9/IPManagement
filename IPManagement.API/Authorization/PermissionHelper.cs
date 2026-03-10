namespace IPManagement.API.Authorization
{
    /// <summary>
    /// Helper class để tạo và phân tích permissions
    /// </summary>
    public static class PermissionHelper
    {
        /// <summary>
        /// Tạo permission string từ Function Code và Command Code
        /// Ví dụ: "ip_address:view", "unit:create"
        /// </summary>
        public static string GetPermission(FunctionCode function, CommandCode command)
        {
            return $"{function.ToString().ToLower()}:{command.ToString().ToLower()}";
        }

        /// <summary>
        /// Phân tích permission string thành Function Code và Command Code
        /// </summary>
        public static (FunctionCode Function, CommandCode Command) ParsePermission(string permission)
        {
            var parts = permission.Split(':');
            if (parts.Length != 2)
                throw new ArgumentException($"Invalid permission format: {permission}");

            var function = Enum.Parse<FunctionCode>(parts[0].ToUpper());
            var command = Enum.Parse<CommandCode>(parts[1].ToUpper());

            return (function, command);
        }

        /// <summary>
        /// Lấy danh sách tất cả permissions
        /// </summary>
        public static string[] GetAllPermissions()
        {
            var permissions = new List<string>();

            foreach (var function in Enum.GetValues<FunctionCode>())
            {
                foreach (var command in Enum.GetValues<CommandCode>())
                {
                    permissions.Add(GetPermission(function, command));
                }
            }

            return permissions.ToArray();
        }

        /// <summary>
        /// Lấy danh sách permissions cho một function cụ thể
        /// </summary>
        public static string[] GetPermissionsByFunction(FunctionCode function)
        {
            var permissions = new List<string>();

            foreach (var command in Enum.GetValues<CommandCode>())
            {
                permissions.Add(GetPermission(function, command));
            }

            return permissions.ToArray();
        }

        /// <summary>
        /// Kiểm tra xem permission string có hợp lệ không
        /// </summary>
        public static bool IsValidPermission(string permission)
        {
            try
            {
                ParsePermission(permission);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}