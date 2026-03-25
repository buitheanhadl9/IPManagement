import { useState, useCallback } from 'react';

export interface GPSPosition {
  latitude: number;
  longitude: number;
  address?: string;
  error?: string;
}

export interface UseGPSReturn {
  getCurrentPosition: () => void;
  loading: boolean;
  position: GPSPosition | null;
  clearPosition: () => void;
}

/**
 * Hook để lấy vị trí GPS từ trình duyệt
 * Sử dụng Geolocation API của browser
 */
export const useGPS = (): UseGPSReturn => {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<GPSPosition | null>(null);

  const getCurrentPosition = useCallback(() => {
    setLoading(true);

    // Kiểm tra xem trình duyệt có hỗ trợ geolocation không
    if (!navigator.geolocation) {
      setPosition({
        latitude: 0,
        longitude: 0,
        error: 'Geolocation không được hỗ trợ bởi trình duyệt này'
      });
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (success) => {
        setPosition({
          latitude: success.coords.latitude,
          longitude: success.coords.longitude
        });
        setLoading(false);
      },
      (error) => {
        let errorMessage = 'Không thể lấy vị trí hiện tại';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Người dùng đã từ chối quyền truy cập vị trí. Vui lòng bật quyền truy cập vị trí trong cài đặt trình duyệt.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Thông tin vị trí không khả dụng. Vui lòng kiểm tra kết nối GPS.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Yêu cầu lấy vị trí đã hết thời gian. Vui lòng thử lại.';
            break;
          default:
            errorMessage = `Lỗi không xác định: ${error.message}`;
        }
        setPosition({
          latitude: 0,
          longitude: 0,
          error: errorMessage
        });
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  const clearPosition = useCallback(() => {
    setPosition(null);
  }, []);

  return {
    getCurrentPosition,
    loading,
    position,
    clearPosition
  };
};