using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace IPManagement.API.Services
{
    public class GeocodingService : IGeocodingService
    {
        private readonly HttpClient _httpClient;
        private const string NominatimBaseUrl = "https://nominatim.openstreetmap.org";

        public GeocodingService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        /// <summary>
        /// Reverse geocoding: chuyển đổi tọa độ GPS thành địa chỉ
        /// Sử dụng OpenStreetMap Nominatim (miễn phí)
        /// </summary>
        public async Task<string?> ReverseGeocodeAsync(decimal latitude, decimal longitude)
        {
            try
            {
                // Validate tọa độ
                if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
                {
                    return null;
                }

                var url = $"{NominatimBaseUrl}/reverse?format=json&lat={latitude}&lon={longitude}&accept-language=vi";
                
                var response = await _httpClient.GetStringAsync(url);
                var result = JsonSerializer.Deserialize<NominatimResponse>(response);
                
                return result?.Display_name;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GeocodingService] ReverseGeocode error: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Forward geocoding: chuyển đổi địa chỉ thành tọa độ GPS
        /// </summary>
        public async Task<(decimal latitude, decimal longitude)?> ForwardGeocodeAsync(string address)
        {
            try
            {
                var encodedAddress = Uri.EscapeDataString(address);
                var url = $"{NominatimBaseUrl}/search?q={encodedAddress}&format=json&limit=1&accept-language=vi";
                
                var response = await _httpClient.GetStringAsync(url);
                var results = JsonSerializer.Deserialize<NominatimSearchResult[]>(response);
                
                if (results != null && results.Length > 0)
                {
                    var lat = decimal.Parse(results[0].Lat);
                    var lon = decimal.Parse(results[0].Lon);
                    return (lat, lon);
                }
                
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GeocodingService] ForwardGeocode error: {ex.Message}");
                return null;
            }
        }

        // Classes để deserialize response từ Nominatim
        private class NominatimResponse
        {
            public string? Display_name { get; set; }
            public string? Lat { get; set; }
            public string? Lon { get; set; }
        }

        private class NominatimSearchResult
        {
            public string? Lat { get; set; }
            public string? Lon { get; set; }
            public string? Display_name { get; set; }
        }
    }
}