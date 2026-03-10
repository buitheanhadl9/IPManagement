import { useEffect, useState } from 'react';
import { useAppSelector } from '../hooks/useAppSelector';
import { Alert, Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { authService } from '../services/auth.service';

// Cấu hình thời gian (phút)
const ACCESS_TOKEN_EXPIRATION_MINUTES = 30;
const WARNING_BEFORE_EXPIRY_MINUTES = 5;
const WARNING_DURATION_MS = WARNING_BEFORE_EXPIRY_MINUTES * 60 * 1000;
const EXPIRATION_MS = ACCESS_TOKEN_EXPIRATION_MINUTES * 60 * 1000;

export const SessionWarning = () => {
  const lastActivity = useAppSelector((state) => state.auth.lastActivity);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<number | null>(null);

  useEffect(() => {
    if (!lastActivity) {
      setTimeRemaining(null);
      setShowWarning(false);
      setLastActivityTime(null);
      return;
    }

    // Lưu thời gian hoạt động cuối cùng
    setLastActivityTime(lastActivity);

    const calculateTimeRemaining = () => {
      if (!lastActivityTime) return;

      const now = Date.now();
      const timeSinceActivity = now - lastActivityTime;
      const remaining = EXPIRATION_MS - timeSinceActivity;

      if (remaining <= WARNING_DURATION_MS && remaining > 0) {
        // Hiển thị warning khi còn dưới 5 phút
        setShowWarning(true);
        setTimeRemaining(remaining);
      } else if (remaining <= 0) {
        // Đã hết hạn
        setShowWarning(false);
        setTimeRemaining(0);
      } else {
        // Chưa đến lúc hiển thị warning
        setShowWarning(false);
        setTimeRemaining(remaining);
      }
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [lastActivity, lastActivityTime]);

  const handleExtendSession = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        const response = await authService.refreshToken(refreshToken);
        localStorage.setItem('token', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);
        // Reset warning sau khi refresh
        setShowWarning(false);
        setTimeRemaining(EXPIRATION_MS);
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  };

  if (!showWarning || timeRemaining === null) {
    return null;
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Alert
      message={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>Phiên làm việc của bạn sắp hết hạn. Bạn sẽ bị đăng xuất trong {formatTime(timeRemaining)}</span>
          </div>
          <Button type="primary" onClick={handleExtendSession}>
            Duy trì phiên làm việc
          </Button>
        </div>
      }
      type="warning"
      showIcon
      style={{ marginBottom: '16px' }}
    />
  );
};