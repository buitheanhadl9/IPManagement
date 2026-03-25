using System.Threading.Tasks;

namespace IPManagement.API.Services
{
    public interface IGeocodingService
    {
        /// <summary>
        /// Reverse geocoding: chuyển đổi tọa độ GPS thành địa chỉ
        /// </summary>
        /// <param name="latitude">Vĩ độ (-90 đến 90)</param>
        /// <param name="longitude">Kinh độ (-180 đến 180)</param>
        /// <returns>Địa chỉ đầy đủ hoặc null nếu không tìm thấy</returns>
        Task<string?> ReverseGeocodeAsync(decimal latitude, decimal longitude);

        /// <summary>
        /// Forward geocoding: chuyển đổi địa chỉ thành tọa độ GPS
        /// </summary>
        /// <param name="address">Địa chỉ cần tìm</param>
        /// <returns>Tọa độ (latitude, longitude) hoặc null nếu không tìm thấy</returns>
        Task<(decimal latitude, decimal longitude)?> ForwardGeocodeAsync(string address);
    }
}