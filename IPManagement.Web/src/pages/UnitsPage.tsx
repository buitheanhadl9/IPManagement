import { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm, Tag, Card, Row, Col, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EnvironmentOutlined, WifiOutlined } from '@ant-design/icons';
import type { Unit, UnitCreateRequest, UnitUpdateRequest } from '../types/unit';
import { unitService } from '../services/unit.service';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { hasPermission, Permissions } from '../utils/permissions';
import { signalRService } from '../services/signalr.service';
import type { UnitUpdateNotification } from '../types/notification';
import TruncatedDescription from '../components/TruncatedDescription';

const { Title } = Typography;
const { Search } = Input;

const UnitsPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  // Check permissions based on user permissions - use useMemo to re-calculate when user changes
  // Chỉ check permission khi đã load xong user
  const canCreateUnit = useMemo(() => user ? hasPermission(user, Permissions.UNIT_CREATE) : false, [user]);
  const canUpdateUnit = useMemo(() => user ? hasPermission(user, Permissions.UNIT_UPDATE) : false, [user]);
  const canDeleteUnit = useMemo(() => user ? hasPermission(user, Permissions.UNIT_DELETE) : false, [user]);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchUnits();

    // Listen for unit update notifications
    const unsubscribeUnit = signalRService.onUnitUpdated((notification: UnitUpdateNotification) => {
      console.log('[UnitsPage] Unit update notification received:', notification);
      
      // Refresh units list when any unit changes
      if (notification.action === 'Deleted') {
        message.success(`Đơn vị "${notification.unitName}" đã được xóa.`);
      } else if (notification.action === 'Created') {
        message.success(`Đơn vị "${notification.unitName}" đã được tạo.`);
      } else {
        message.success(`Đơn vị "${notification.unitName}" đã được cập nhật.`);
      }
      
      fetchUnits();
    });

    // Listen for permissions update notifications - to refresh units list when permissions change
    const unsubscribePermissions = signalRService.onPermissionsUpdated(() => {
      // Re-fetch units list when permissions change (user may have lost access to some units)
      fetchUnits();
    });

    return () => {
      unsubscribeUnit();
      unsubscribePermissions();
    };
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      const filtered = units.filter((u) =>
        u.name.toLowerCase().includes(lowerTerm) ||
        u.code?.toLowerCase().includes(lowerTerm)
      );
      setFilteredUnits(filtered);
    } else {
      setFilteredUnits(units);
    }
  }, [searchTerm, units]);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const data = await unitService.getAllUnits();
      setUnits(data);
    } catch {
      message.error('Failed to fetch units');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!canCreateUnit) {
      message.error('Bạn không có quyền thêm đơn vị.');
      return;
    }
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Unit) => {
    if (!canUpdateUnit) {
      message.error('Bạn không có quyền chỉnh sửa đơn vị.');
      return;
    }
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      address: record.address,
      parentUnitId: record.parentUnitId,
      description: record.description,
      note: record.note,
      isActive: record.isActive,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    if (!canDeleteUnit) {
      message.error('Bạn không có quyền xóa đơn vị.');
      return;
    }
    try {
      await unitService.deleteUnit(id);
      message.success('Unit deleted successfully');
      fetchUnits();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete unit';
      message.error('Failed to delete unit: ' + errorMessage);
    }
  };

  const handleSubmit = async (values: UnitCreateRequest | UnitUpdateRequest) => {
    if (editingId && !canUpdateUnit) {
      message.error('Bạn không có quyền chỉnh sửa đơn vị.');
      return;
    }
    if (!editingId && !canCreateUnit) {
      message.error('Bạn không có quyền thêm đơn vị.');
      return;
    }
    try {
      if (editingId) {
        await unitService.updateUnit(editingId, values as UnitUpdateRequest);
        message.success('Unit updated successfully');
      } else {
        await unitService.createUnit(values as UnitCreateRequest);
        message.success('Unit created successfully');
      }
      setModalVisible(false);
      fetchUnits();
    } catch {
      message.error('Failed to save unit');
    }
  };

  const handleViewIPs = (unitId: number, unitName: string) => {
    navigate(`/units/${unitId}?name=${encodeURIComponent(unitName)}`);
  };

  const columns = [
    {
      title: 'Tên đơn vị',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Unit) => (
        <a onClick={() => handleViewIPs(record.id, name)} style={{ fontWeight: 500 }}>
          {name}
        </a>
      ),
    },
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      render: (code: string | undefined) => code || '-',
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      render: (address: string | undefined) => address || '-',
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      render: (description: string | undefined) => <TruncatedDescription description={description} />,
    },
    {
      title: 'Số IP',
      dataIndex: 'ipAddressCount',
      key: 'ipAddressCount',
      align: 'center' as const,
      render: (count: number) => <Tag color="blue">{count || 0}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      align: 'center' as const,
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>{isActive ? 'Hoạt động' : 'Không hoạt động'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      width: 150,
      render: (_: unknown, record: Unit) => (
        <Space>
          {canUpdateUnit && (
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
              type="primary"
            />
          )}
          {canDeleteUnit && (
            <Popconfirm
              title="Delete Unit"
              description="Are you sure you want to delete this unit?"
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

  // UnitCard Component for Mobile View
  const UnitCard = ({ unit }: { unit: Unit }) => {
    return (
      <Card size="small" style={{ marginBottom: 12 }} className="unit-mobile-card">
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Space>
                <EnvironmentOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                <span style={{ fontSize: 16, fontWeight: 600 }}>{unit.name}</span>
              </Space>
              <Tag color={unit.isActive ? 'green' : 'default'}>{unit.isActive ? 'Hoạt động' : 'Không hoạt động'}</Tag>
            </div>
          </Col>

          <Col span={24}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Space>
                <strong>Mã:</strong> <span>{unit.code || '-'}</span>
              </Space>
              <Space>
                <strong>Đơn vị cấp trên:</strong> <span>{unit.parentUnitName || 'Root'}</span>
              </Space>
              {unit.address && (
                <Space>
                  <strong>Địa chỉ:</strong> <span>{unit.address}</span>
                </Space>
              )}
              <Space>
                <strong>Số IP:</strong> <Tag color="blue">{unit.ipAddressCount || 0}</Tag>
              </Space>
              {unit.description && (
                <Space>
                  <strong>Mô tả:</strong> <span style={{ color: '#666' }}>{unit.description}</span>
                </Space>
              )}
            </Space>
          </Col>

          <Col span={24}>
            <Space wrap>
              <Button icon={<WifiOutlined />} onClick={() => handleViewIPs(unit.id, unit.name)} size="small">
                View IPs
              </Button>
              {canUpdateUnit && (
                <Button icon={<EditOutlined />} onClick={() => handleEdit(unit)} size="small" type="primary">
                  Edit
                </Button>
              )}
              {canDeleteUnit && (
                <Popconfirm
                  title="Delete Unit"
                  description="Are you sure you want to delete this unit?"
                  onConfirm={() => handleDelete(unit.id)}
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

  return (
    <div>
      <Card className="responsive-card">
        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={24} md={12} lg={10}>
            <Title level={3} style={{ margin: 0, marginBottom: 0 }}>Quản lý đơn vị</Title>
          </Col>
          <Col xs={24} sm={24} md={12} lg={14}>
            <Space direction="horizontal" wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Search
                placeholder="Tìm kiếm theo tên hoặc mã..."
                allowClear
                onSearch={setSearchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', maxWidth: 300 }}
                prefix={<SearchOutlined />}
              />
              {canCreateUnit && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  Thêm đơn vị
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {isMobile ? (
          <div style={{ marginTop: 16 }}>
            {filteredUnits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                Không có đơn vị nào
              </div>
            ) : (
              <>
                {filteredUnits.map((unitItem) => (
                  <UnitCard key={unitItem.id} unit={unitItem} />
                ))}
              </>
            )}
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredUnits}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 50, showSizeChanger: true, showQuickJumper: true }}
            scroll={{ x: 900 }}
            size="small"
          />
        )}
      </Card>

      <Modal
        title={editingId ? 'Sửa đơn vị' : 'Thêm đơn vị'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
        bodyStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
        style={{ maxWidth: '95vw' }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Tên đơn vị"
            rules={[{ required: true, message: 'Vui lòng nhập tên đơn vị' }]}
          >
            <Input placeholder="e.g., Xã ABC" />
          </Form.Item>

          <Form.Item
            name="code"
            label="Mã đơn vị"
          >
            <Input placeholder="e.g., X-ABC-001" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Địa chỉ"
          >
            <Input placeholder="e.g., 123 Đường XYZ, Phường..." />
          </Form.Item>

          <Form.Item
            name="parentUnitId"
            label="Đơn vị cấp trên"
          >
            <Select placeholder="Chọn đơn vị cấp trên" allowClear showSearch optionFilterProp="children">
              {units.filter((u) => u.id !== editingId).map((unit) => (
                <Select.Option key={unit.id} value={unit.id}>
                  {unit.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
          >
            <Input.TextArea rows={3} placeholder="Nhập mô tả đơn vị" />
          </Form.Item>

          <Form.Item
            name="note"
            label="Ghi chú"
          >
            <Input.TextArea rows={3} placeholder="Nhập ghi chú" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Trạng thái"
            valuePropName="checked"
          >
            <Select placeholder="Chọn trạng thái">
              <Select.Option value={true}>Hoạt động</Select.Option>
              <Select.Option value={false}>Không hoạt động</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UnitsPage;