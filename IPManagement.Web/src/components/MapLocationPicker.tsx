import React, { useState, useEffect } from 'react';
import { Modal, Button, message, Input } from 'antd';
import { EnvironmentOutlined, LoadingOutlined, SearchOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icons in React
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Delete default icons and replace them
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export interface MapLocationPickerProps {
  visible: boolean;
  onCancel: () => void;
  onSelect: (latitude: number, longitude: number, address?: string) => void;
  initialLat?: number;
  initialLng?: number;
}

// DEFAULT TO VIETNAM (Hanoi approx)
const DEFAULT_CENTER: [number, number] = [21.028511, 105.804817];

// Component to handle map search - rendered inside MapContainer
const MapSearchControl: React.FC<{
  searchTerm: string;
  onSearch: (term: string) => void;
  onSearchSubmit: (lat: number, lng: number) => void;
}> = ({ searchTerm, onSearch, onSearchSubmit }) => {
  const map = useMap();
  const loadingMessageRef = React.useRef<(() => void) | null>(null);
  
  // Cleanup when component unmounts (modal closes)
  React.useEffect(() => {
    return () => {
      if (loadingMessageRef.current) {
        loadingMessageRef.current();
        loadingMessageRef.current = null;
      }
    };
  }, []);
  
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      message.warning('Vui lòng nhập địa chỉ để tìm kiếm!');
      return;
    }
    
    // Close any existing loading message first
    if (loadingMessageRef.current) {
      loadingMessageRef.current();
    }
    
    // Show new loading message and store close function
    loadingMessageRef.current = message.loading('Đang tìm kiếm địa chỉ...', 0);
    
    try {
      const encodedTerm = encodeURIComponent(searchTerm);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedTerm}&accept-language=vi&limit=1`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        map.flyTo([lat, lng], 16, { duration: 1.5 });
        onSearchSubmit(lat, lng);
        message.success(`Đã tìm thấy: ${result.display_name}`);
      } else {
        message.warning('Không tìm thấy địa chỉ nào phù hợp!');
      }
    } catch (error) {
      console.error('Search failed:', error);
      message.error('Không thể tìm kiếm địa chỉ!');
    } finally {
      // Close loading message
      if (loadingMessageRef.current) {
        loadingMessageRef.current();
        loadingMessageRef.current = null;
      }
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      zIndex: 1000,
      display: 'flex',
      gap: '8px',
      maxWidth: '400px'
    }}>
      <Input
        placeholder="Nhập địa chỉ để tìm kiếm..."
        value={searchTerm}
        onChange={(e) => onSearch(e.target.value)}
        onKeyPress={handleKeyPress}
        prefix={<SearchOutlined style={{ color: '#1890ff' }} />}
        style={{ width: 300 }}
        allowClear
      />
    </div>
  );
};

const LocationMarker = ({
  position, 
  setPosition 
}: { 
  position: L.LatLng | null; 
  setPosition: (pos: L.LatLng) => void 
}) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  visible,
  onCancel,
  onSelect,
  initialLat,
  initialLng,
}) => {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Set initial position when modal opens
  useEffect(() => {
    if (visible && initialLat && initialLng) {
      setPosition(new L.LatLng(initialLat, initialLng));
    } else if (visible && !position) {
      // If we don't have an initial position, we can try to get the user's current location to center the map
      // but we don't set the marker immediately. Just leave it null.
      if ("geolocation" in navigator) {
         navigator.geolocation.getCurrentPosition((_pos) => {
             // We don't necessarily want to set the marker, just center map if possible,
             // but MapContainer's center prop is not reactive. It's fine to just leave as default.
         }, () => {
             // ignore errors
         }, { timeout: 5000 });
      }
    }
    
    // Cleanup when closing
    if (!visible) {
      setTimeout(() => setPosition(null), 300); // clear after animation
      message.destroy(); // destroy all messages related to this modal
    }
  }, [visible, initialLat, initialLng]);

  // Handle search result - set marker at searched location
  const handleSearchSubmit = (lat: number, lng: number) => {
    setPosition(new L.LatLng(lat, lng));
  };

  const handleConfirm = async () => {
    if (!position) {
      message.warning('Vui lòng click trên bản đồ để chọn một vị trí!');
      return;
    }

    setLoadingAddress(true);
    try {
      // Reverse geocode to get address
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}&accept-language=vi`;
      const response = await fetch(url);
      const data = await response.json();
      
      let address = undefined;
      if (data && data.display_name) {
        address = data.display_name;
        message.success(`Đã lấy địa chỉ: ${address}`);
      } else {
        message.success(`Đã chọn vị trí: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`);
      }
      
      onSelect(position.lat, position.lng, address);
      onCancel();
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      message.success(`Đã chọn vị trí: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`);
      onSelect(position.lat, position.lng);
      onCancel();
    } finally {
      setLoadingAddress(false);
    }
  };

  const center: [number, number] = initialLat && initialLng 
    ? [initialLat, initialLng] 
    : DEFAULT_CENTER;

  return (
    <Modal
      title="Chọn vị trí trên bản đồ"
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          icon={loadingAddress ? <LoadingOutlined /> : <EnvironmentOutlined />}
          loading={loadingAddress} 
          onClick={handleConfirm}
          disabled={!position}
        >
          {loadingAddress ? 'Đang lấy địa chỉ...' : 'Xác nhận vị trí này'}
        </Button>,
      ]}
      styles={{
         body: { padding: 0 }
      }}
      destroyOnClose
    >
      <div style={{ height: '60vh', width: '100%', minHeight: '400px', backgroundColor: '#f0f2f5', position: 'relative' }}>
        {visible && (
          <MapContainer
            center={center}
            zoom={initialLat ? 16 : 6}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapSearchControl
              searchTerm={searchTerm}
              onSearch={setSearchTerm}
              onSearchSubmit={handleSearchSubmit}
            />
            <LocationMarker position={position} setPosition={setPosition} />
          </MapContainer>
        )}
      </div>
      <div style={{ padding: '12px 24px', backgroundColor: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
        <p style={{ margin: 0, color: '#666' }}>
          <strong>Hướng dẫn:</strong> Di chuyển bản đồ và click chuột (hoặc chạm vào màn hình) để đánh dấu vị trí.
        </p>
        {position && (
          <div style={{ marginTop: 8, fontSize: '12px', color: '#1890ff' }}>
            <span>Đã chọn: Tọa độ ({position.lat.toFixed(6)}, {position.lng.toFixed(6)})</span>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MapLocationPicker;
