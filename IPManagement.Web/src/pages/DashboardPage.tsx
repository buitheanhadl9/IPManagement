import { Card, Col, Row, Statistic, Tag, Space } from 'antd';
import { UserOutlined, TeamOutlined, BuildOutlined } from '@ant-design/icons';
import { useAppSelector } from '../hooks/useAppSelector';
import '../index.css';

const DashboardPage = () => {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <div>
      <h1 className="dashboard-title" style={{ marginBottom: 24, fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: 'black' }}>Dashboard</h1>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={24} md={8}>
          <Card>
            <Statistic
              title="Welcome"
              value={user?.fullName || user?.username}
              prefix={<UserOutlined />}
              styles={{ content: { fontSize: 18 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Card>
            <Statistic
              title="Your Primary Unit"
              value={user?.unitName || 'N/A'}
              prefix={<BuildOutlined />}
              styles={{ content: { fontSize: 18 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Card>
            <Statistic
              title="Role"
              value={user?.roles?.join(', ') || 'N/A'}
              prefix={<TeamOutlined />}
              styles={{ content: { fontSize: 18 } }}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={24} md={24}>
          <Card title="Quick Info">
            <p>Chào mừng đến với hệ thống quản lý địa chỉ IP.</p>
            <p>
               Bạn đang đăng nhập với tư cách: <strong>{user?.roles?.join(', ') || 'N/A'}</strong>
               {user?.unitName && ` tại đơn vị chính: <strong>${user.unitName}</strong>`}
             </p>
            {user?.units && user.units.length > 0 && (
              <div>
                <div>Các đơn vị được quản lý:</div>
                <Space wrap style={{ marginTop: 8 }}>
                  {user.units.map((unit, index) => (
                    <Tag key={index} color={unit.isPrimary ? 'blue' : 'default'}>
                      {unit.name} {unit.isPrimary && '(Chính)'} - {unit.role}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
            <p>Sử dụng menu bên trái để điều hướng đến các chức năng khác.</p>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;