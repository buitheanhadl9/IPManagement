import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm, Card, Row, Col, Typography, Tag, Breadcrumb } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { IPAddress, IPAddressCreateRequest, IPAddressUpdateRequest } from '../types/ip';
import { ipService } from '../services/ip.service';
import { unitService } from '../services/unit.service';
import type { Unit } from '../types/unit';
import { useAppSelector } from '../hooks/useAppSelector';
import { hasPermission, Permissions } from '../utils/permissions';

const { Title } = Typography;

const UnitDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const unitName = new URLSearchParams(location.search).get('name') || 'Chi tiết đơn vị';
  const user = useAppSelector((state) => state.auth.user);
  
  const [ipAddresses, setIPAddresses] = useState<IPAddress[]>([]);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  // Check permissions
  const canCreateIP = hasPermission(user?.roles, Permissions.IP_CREATE);
  const canUpdateIP = hasPermission(user?.roles, Permissions.IP_UPDATE);
  const canDeleteIP = hasPermission(user?.roles, Permissions.IP_DELETE);

  useEffect(() => {
    if (id) {
      fetchUnit();
      fetchIPAddresses();
    }
  }, [id]);

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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'Active' ? 'green' : status === 'Reserved' ? 'orange' : 'red'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center' as const,
      width: 100,
      render: (_: unknown, record: IPAddress) => (
        <Space>
          {canUpdateIP && (
            <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" />
          )}
          {canDeleteIP && (
            <Popconfirm
              title="Xóa IP Address"
              description="Bạn có chắc muốn xóa IP này?"
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

        <Table
          columns={columns}
          dataSource={ipAddresses}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 1000 }}
          size="small"
        />
      </Card>

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