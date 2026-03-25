import React, { useEffect, useState } from 'react';
import { Button, message } from 'antd';
import { EnvironmentOutlined, LoadingOutlined, CompassOutlined } from '@ant-design/icons';
import { useGPS } from '../hooks/useGPS';

export interface GPSLocationButtonProps {
  onLocationFound: (latitude: number, longitude: number, address?: string) => void;
  onLocationFetched?: () => void;
  buttonText?: string;
  size?: 'small' | 'middle' | 'large';
  disabled?: boolean;
  showAddress?: boolean;
  showMapsButton?: boolean;
}

/**
 * Component nút lấy vị trí hiện tại từ GPS
 * Sử dụng trên mobile để cập nhật vị trí cho Unit
 */
const GPSLocationButton: React.FC<GPSLocationButtonProps> = ({
  onLocationFound,
  onLocationFetched,
  buttonText = 'Lấy vị trí hiện tại',
  size = 'middle',
  disabled = false,
  showAddress = true,
  showMapsButton = true
}) => {
  const { getCurrentPosition, loading, position, clearPosition } = useGPS();
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | undefined>(undefined);
  const [currentLng, setCurrentLng] = useState<number | undefined>(undefined);

  // Hàm gọi OpenStreetMap Nominatim API để lấy địa chỉ từ tọa độ
  const reverseGeocode = async (latitude: number, longitude: number) => {
    setReverseGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=vi`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.display_name) {
        setCurrentLat(latitude);
        setCurrentLng(longitude);
        message.success(`Đã lấy địa chỉ: ${data.display_name}`);
        onLocationFound(latitude, longitude, data.display_name);
        if (onLocationFetched) onLocationFetched();
      } else {
        setCurrentLat(latitude);
        setCurrentLng(longitude);
        message.success(`Đã lấy vị trí: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        onLocationFound(latitude, longitude);
        if (onLocationFetched) onLocationFetched();
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      setCurrentLat(latitude);
      setCurrentLng(longitude);
      message.success(`Đã lấy vị trí: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      onLocationFound(latitude, longitude);
      if (onLocationFetched) onLocationFetched();
    } finally {
      setReverseGeocoding(false);
    }
  };

  // Xử lý khi có vị trí mới
  useEffect(() => {
    if (position) {
      if (position.error) {
        message.error(position.error);
        clearPosition();
      } else if (position.latitude !== 0 && position.longitude !== 0) {
        if (showAddress) {
          reverseGeocode(position.latitude, position.longitude);
        } else {
          setCurrentLat(position.latitude);
          setCurrentLng(position.longitude);
          message.success(
            `Đã lấy vị trí: ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
          );
          onLocationFound(position.latitude, position.longitude);
          if (onLocationFetched) onLocationFetched();
          clearPosition();
        }
      }
    }
  }, [position, onLocationFound, clearPosition, showAddress]);

  // Mở Google Maps với tọa độ hiện tại
  const openGoogleMaps = () => {
    if (currentLat && currentLng) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${currentLat},${currentLng}`;
      window.open(mapsUrl, '_blank');
    } else {
      message.warning('Chưa có vị trí GPS. Vui lòng lấy vị trí trước.');
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Button
        icon={loading || reverseGeocoding ? <LoadingOutlined /> : <EnvironmentOutlined />}
        onClick={getCurrentPosition}
        loading={loading || reverseGeocoding}
        size={size}
        type="default"
        disabled={disabled || loading || reverseGeocoding}
        title="Nhấn để lấy vị trí GPS hiện tại"
      >
        {loading || reverseGeocoding ? 'Đang lấy vị trí...' : buttonText}
      </Button>
      {showMapsButton && currentLat && currentLng && (
        <Button
          icon={<CompassOutlined />}
          onClick={openGoogleMaps}
          size={size}
          type="primary"
          title="Mở Google Maps để xem vị trí và tìm đường"
        >
          Tìm đường
        </Button>
      )}
    </div>
  );
};

export default GPSLocationButton;