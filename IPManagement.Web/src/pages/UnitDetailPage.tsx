import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm, Card, Row, Col, Typography, Tag, Breadcrumb } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, WifiOutlined } from '@ant-design/icons';
import type { IPAddress, IPAddressCreateRequest, IPAddressUpdateRequest } from '../types/ip';
import { ipService } from '../services/ip.service';
import { unitService } from '../services/unit.service';
import type { Unit } from '../types/unit';
import { useAppSelector } from '../hooks/useAppSelector';
import { hasPermission, Permissions, isAssignedToUnit, isAdmin } from '../utils/permissions';
import { signalRService } from '../services/signalr.service';
import type { UnitUpdateNotification, PermissionUpdateNotification } from '../types/notification';
import TruncatedDescription from '../components/TruncatedDescription';
import DrawingManagement from '../components/DrawingManagement';

const { Title } = Typography;

const UnitDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const unitName = new URLSearchParams(location.search).get('name') || 'Chi tiết đơn vị';
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  
  const [ipAddresses, setIPAddresses] = useState<IPAddress[]>([]);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Check permissions - use useMemo to re-calculate when user changes
  // Chỉ check permission khi đã load xong user
  const canCreateIP = useMemo(() => user ? hasPermission(user, Permissions.IP_CREATE) : false, [user]);
  const canUpdateIP = useMemo(() => user ? hasPermission(user, Permissions.IP_UPDATE) : false, [user]);
  const canDeleteIP = useMemo(() => user ? hasPermission(user, Permissions.IP_DELETE) : false, [user]);
  const canReadIP = useMemo(() => user ? hasPermission(user, Permissions.IP_READ) : false, [user]);
  
  // Drawing permissions
  const canCreateDrawing = useMemo(() => user ? hasPermission(user, Permissions.DRAWING_CREATE) : false, [user]);
  const canUpdateDrawing = useMemo(() => user ? hasPermission(user, Permissions.DRAWING_UPDATE) : false, [user]);
  const canDeleteDrawing = useMemo(() => user ? hasPermission(user, Permissions.DRAWING_DELETE) : false, [user]);
  const canReadDrawing = useMemo(() => user ? hasPermission(user, Permissions.DRAWING_READ) : false, [user]);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Kiểm tra quyền truy cập unit - use useMemo to re-calculate when user or id changes
  // User cần có quyền IP_READ và được gán vào đơn vị (hoặc là Admin) mới được truy cập
  const hasUnitAccess = useMemo(() => {
    if (!id) return false;
    // Nếu chưa có user (đang loading), chưa kiểm tra
    if (!user || !isAuthenticated) return null;
    // Admin có thể truy cập mọi đơn vị
    if (isAdmin(user)) return true;
    // User thường cần có quyền IP_READ VÀ được gán vào đơn vị
    return canReadIP && isAssignedToUnit(user, parseInt(id));
  }, [user, id, canReadIP, isAuthenticated]);
  
  useEffect(() => {
    // Đợi user được load xong trước khi kiểm tra quyền
    if (!isAuthenticated) {
      // Chưa đăng nhập, chưa kiểm tra
      setCheckingAccess(true);
      return;
    }
    
    if (id && hasUnitAccess !== null) {
      setCheckingAccess(false);
      // Kiểm tra quyền truy cập trước khi fetch dữ liệu
      if (!hasUnitAccess && !isAdmin(user)) {
        message.error('Bạn không có quyền truy cập đơn vị này');
        navigate('/units');
        return;
      }
      fetchUnit();
      fetchIPAddresses();
    }

    // Listen for unit update notifications
    const unsubscribeUnit = signalRService.onUnitUpdated((notification: UnitUpdateNotification) => {
      console.log('[UnitDetailPage] Unit update notification received:', notification);
      
      // Nếu notification liên quan đến unit hiện tại
      if (id && notification.unitId === parseInt(id)) {
        if (notification.action === 'Deleted') {
          message.warning(`Đơn vị "${notification.unitName}" đã được xóa. Quay về danh sách.`);
          navigate('/units');
        } else {
          message.success(`Đơn vị đã được cập nhật.`);
          fetchUnit();
        }
      }
    });

    // Listen for permissions update notifications - to refresh when permissions change
    const unsubscribePermissions = signalRService.onPermissionsUpdated((_notification: PermissionUpdateNotification) => {
      // Re-fetch data when permissions change (user may have lost access)
      if (id) {
        fetchUnit();
        fetchIPAddresses();
      }
    });

    return () => {
      unsubscribeUnit();
      unsubscribePermissions();
    };
  }, [id, hasUnitAccess, isAuthenticated]);

  const fetchUnit = async () => {
    if (!id) return;
    try {
      const data = await unitService.getUnitById(parseInt(id));
      setUnit(data);
    } catch (error) {
      console.error('Failed to fetch unit:', error);
    }
  };

  const fetchIPAddresses = async () => {
    if (!id) return;
    const unitId = parseInt(id);
    if (isNaN(unitId)) {
      message.error('Invalid unit ID');
      return;
    }
    setLoading(true);
    try {
      const response = await ipService.getIPAddresses(1, 100, undefined, unitId);
      setIPAddresses(response.items);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch IP addresses';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!canCreateIP) {
      message.error('Bạn không có quyền thêm IP');
      return;
    }
    setEditingId(null);
    form.resetFields();
    if (id) {
      form.setFieldsValue({ unitId: parseInt(id) });
    }
    setModalVisible(true);
  };

  const handleEdit = (record: IPAddress) => {
    if (!canUpdateIP) {
      message.error('Bạn không có quyền chỉnh sửa IP');
      return;
    }
    setEditingId(record.id);
    form.setFieldsValue({
      ipAddress: record.ipAddress,
      macAddress: record.macAddress,
      deviceName: record.deviceName,
      deviceType: record.deviceType,
      port: record.port,
      unitId: record.unitId,
      status: record.status,
      description: record.description,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    if (!canDeleteIP) {
      message.error('Bạn không có quyền xóa IP');
      return;
    }
    try {
      await ipService.deleteIPAddress(id);
      message.success('IP address deleted successfully');
      fetchIPAddresses();
    } catch {
      message.error('Failed to delete IP address');
    }
  };

  const handleSubmit = async (values: IPAddressCreateRequest | IPAddressUpdateRequest) => {
    if (editingId && !canUpdateIP) {
      message.error('Bạn không có quyền chỉnh sửa IP');
      return;
    }
    if (!editingId && !canCreateIP) {
      message.error('Bạn không có quyền thêm IP');
      return;
    }
    const createValues = values as IPAddressCreateRequest;
    // Ensure unitId is always set from the current unit
    if (!id) {
      message.error('No unit ID available');
      return;
    }
    createValues.unitId = parseInt(id);
    console.log('Form values before submit:', values);
    console.log('Form values unitId (ensured):', createValues.unitId);
    try {
      if (editingId) {
        await ipService.updateIPAddress(editingId, values as IPAddressUpdateRequest);
        message.success('IP address updated successfully');
      } else {
        console.log('Creating IP with values:', createValues);
        const result = await ipService.createIPAddress(createValues);
        console.log('Create result:', result);
        message.success('IP address created successfully');
      }
      setModalVisible(false);
      fetchIPAddresses();
    } catch (error) {
      console.error('Failed to save IP address:', error);
      
      // Handle validation errors from backend
      if (error && typeof error === 'object' && 'response' in error && error.response) {
        const errorResponse = error.response as { status?: number; data?: { errors?: Record<string, string[]>; message?: string } };
        if (errorResponse.status === 400 && errorResponse.data?.errors) {
          const errors = errorResponse.data.errors;
          const errorMessages = Object.entries(errors).map(([, fieldErrors]) =>
            Array.isArray(fieldErrors) ? fieldErrors.join(', ') : String(fieldErrors)
          ).join('; ');
          message.error('Validation error: ' + errorMessages);
        } else {
          message.error('Failed to save IP address: ' + (errorResponse.data?.message || 'Unknown error'));
        }
      } else {
        message.error('Failed to save IP address: Unknown error');
      }
    }
  };

  const columns = [
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
    },
    {
      title: 'MAC Address',
      dataIndex: 'macAddress',
      key: 'macAddress',
      render: (mac: string | undefined) => mac || '-',
    },
    {
      title: 'Device Name',
      dataIndex: 'deviceName',
      key: 'deviceName',
      render: (name: string | undefined) => name || '-',
    },
    {
      title: 'Device Type',
      dataIndex: 'deviceType',
      key: 'deviceType',
      render: (type: string | undefined) => type || '-',
    },
    {
      title: 'Port',
      dataIndex: 'port',
      key: 'port',
      render: (port: string | undefined) => port || '-',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      render: (desc: string | undefined) => <TruncatedDescription description={desc} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      width: 100,
      render: (_: unknown, record: IPAddress) => (
        <Space>
          {canUpdateIP && (
            <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" type="primary" />
          )}
          {canDeleteIP && (
            <Popconfirm
              title="Delete IP Address"
              description="Are you sure you want to delete this IP?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button icon={<DeleteOutlined />} danger size="small" />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // IPCard Component for Mobile View
  const IPCard = ({ ip }: { ip: IPAddress }) => {
    const statusColor = ip.status === 'Active' ? 'green' : ip.status === 'Reserved' ? 'orange' : 'red';
    const deviceTypeColor = ip.deviceType === 'PC' ? 'blue' : ip.deviceType === 'Printer' ? 'green' : ip.deviceType === 'Server' ? 'red' : 'default';
    
    return (
      <Card size="small" style={{ marginBottom: 12 }} className="ip-mobile-card">
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Space>
                <WifiOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                <span style={{ fontSize: 16, fontWeight: 600 }}>{ip.ipAddress}</span>
              </Space>
              <Tag color={statusColor}>{ip.status}</Tag>
            </div>
          </Col>
          
          <Col span={24}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Space>
                <strong>MAC:</strong> <span>{ip.macAddress || '-'}</span>
              </Space>
              <Space>
                <strong>Device:</strong> <span>{ip.deviceName || '-'}</span>
              </Space>
              <Space>
                <strong>Type:</strong> <Tag color={deviceTypeColor}>{ip.deviceType || '-'}</Tag>
              </Space>
              <Space>
                <strong>Port:</strong> <span>{ip.port || '-'}</span>
              </Space>
              {ip.description && (
                <Space>
                  <strong>Note:</strong> <span style={{ color: '#666' }}>{ip.description}</span>
                </Space>
              )}
            </Space>
          </Col>
          
          <Col span={24}>
            <Space wrap>
              {canUpdateIP && (
                <Button icon={<EditOutlined />} onClick={() => handleEdit(ip)} size="small" type="primary">
                  Edit
                </Button>
              )}
              {canDeleteIP && (
                <Popconfirm
                  title="Delete IP Address"
                  description="Are you sure you want to delete this IP?"
                  onConfirm={() => handleDelete(ip.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button icon={<DeleteOutlined />} danger size="small">
                    Delete
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  // Đang kiểm tra quyền truy cập (chờ user được load)
  if (checkingAccess || hasUnitAccess === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Card>
          <Title level={4}>Đang kiểm tra quyền...</Title>
        </Card>
      </div>
    );
  }

  // Nếu không có quyền truy cập, hiển thị thông báo lỗi
  if (!hasUnitAccess && !isAdmin(user)) {
    return (
      <div>
        <Breadcrumb
          items={[
            { title: 'Quản lý đơn vị', href: '/units' },
            { title: 'Lỗi quyền truy cập' },
          ]}
          style={{ marginBottom: 16 }}
          separator=">"
        />
        <Card>
          <Title level={4} style={{ color: '#ff4d4f' }}>
            <span role="img" aria-label="error" style={{ marginRight: 8 }}>⚠️</span>
            Không có quyền truy cập
          </Title>
          <p>Bạn không có quyền truy cập đơn vị này. Vui lòng liên hệ quản trị viên để được cấp quyền.</p>
          <Button type="primary" onClick={() => navigate('/units')}>
            Quay lại danh sách đơn vị
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card className="responsive-card">
        <Breadcrumb
          items={[
            { title: 'Quản lý đơn vị', href: '#' },
            { title: unitName },
          ]}
          style={{ marginBottom: 16 }}
          separator=">"
        />

        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={24} md={16} lg={18}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/units')}
              style={{ marginBottom: 8 }}
            >
              Quay lại
            </Button>
            <Title level={3} style={{ margin: 0 }}>{unitName}</Title>
            {unit && (
              <div style={{ marginTop: 8, color: '#666' }}>
                {unit.address && <span>Địa chỉ: {unit.address} | </span>}
                <span>Số IP: <Tag color="blue">{ipAddresses.length}</Tag></span>
              </div>
            )}
          </Col>
          <Col xs={24} sm={24} md={8} lg={6}>
            {canCreateIP && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} block>
                Thêm IP Address
              </Button>
            )}
          </Col>
        </Row>

        {isMobile ? (
          <div style={{ marginTop: 16 }}>
            {ipAddresses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                Không có IP address nào
              </div>
            ) : (
              <>
                {ipAddresses.map((ipItem) => (
                  <IPCard key={ipItem.id} ip={ipItem} />
                ))}
              </>
            )}
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={ipAddresses}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 1000 }}
            size="small"
            rowClassName={(record) => {
              // Check if this IP address is duplicated within the same unit
              const duplicateIPs = ipAddresses.filter(
                (ip) => ip.ipAddress === record.ipAddress && ip.id !== record.id
              );
              return duplicateIPs.length > 0 ? 'duplicate-ip-row' : '';
            }}
          />
        )}
      </Card>

      {id && unitName && (
        <DrawingManagement
          unitId={parseInt(id)}
          unitName={unitName}
          canCreate={canCreateDrawing && hasUnitAccess}
          canUpdate={canUpdateDrawing && hasUnitAccess}
          canDelete={canDeleteDrawing && hasUnitAccess}
        />
      )}

      <Modal
        title={editingId ? 'Sửa IP Address' : 'Thêm IP Address'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
        bodyStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
        style={{ maxWidth: '95vw' }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="ipAddress"
            label="IP Address"
            rules={[
              { required: true, message: 'Vui lòng nhập IP address' },
              { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'Invalid IP address format' },
            ]}
          >
            <Input placeholder="e.g., 192.168.1.1" />
          </Form.Item>

          <Form.Item
            name="macAddress"
            label="MAC Address"
            rules={[
              {
                pattern: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^$/,
                message: 'MAC address phải có định dạng 00:1A:2B:3C:4D:5E hoặc để trống'
              },
            ]}
          >
            <Input placeholder="e.g., 00:1A:2B:3C:4D:5E" />
          </Form.Item>

          <Form.Item
            name="deviceName"
            label="Device Name"
          >
            <Input placeholder="e.g., Server-01" />
          </Form.Item>

          <Form.Item
            name="deviceType"
            label="Device Type"
          >
            <Select placeholder="Chọn loại thiết bị" allowClear>
              <Select.Option value="PC">PC</Select.Option>
              <Select.Option value="Server">Server</Select.Option>
              <Select.Option value="Printer">Printer</Select.Option>
              <Select.Option value="Switch">Switch</Select.Option>
              <Select.Option value="Router">Router</Select.Option>
              <Select.Option value="IP Camera">IP Camera</Select.Option>
              <Select.Option value="Other">Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="port"
            label="Port"
          >
            <Input placeholder="e.g., ETH0" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
          >
            <Select placeholder="Chọn trạng thái">
              <Select.Option value="Active">Active</Select.Option>
              <Select.Option value="Inactive">Inactive</Select.Option>
              <Select.Option value="Reserved">Reserved</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
          >
            <Input.TextArea rows={3} placeholder="Nhập mô tả" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UnitDetailPage;