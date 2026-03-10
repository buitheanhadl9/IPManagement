import { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Tag, message, Card, Breadcrumb, Typography, Popconfirm, Select, Modal, Form } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { IPAddress, IPAddressCreateRequest, IPAddressUpdateRequest } from '../types/ip';
import { ipService } from '../services/ip.service';
import { unitService } from '../services/unit.service';
import type { Unit } from '../types/unit';
import { format } from 'date-fns';
import { useAppSelector } from '../hooks/useAppSelector';
import { hasPermission, Permissions } from '../utils/permissions';

const { Title } = Typography;
const { Search } = Input;

const IPManagementPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  
  const [ipAddresses, setIPAddresses] = useState<IPAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [unitIdFilter, setUnitIdFilter] = useState<number | null>(null);
  const [units, setUnits] = useState<{ id: number; name: string }[]>([]);
  
  // Check permissions (dùng Unified Roles - level cao nhất trong units áp dụng toàn hệ thống)
  const canReadIP = hasPermission(user, Permissions.IP_READ);
  const canCreateIP = hasPermission(user, Permissions.IP_CREATE);
  const canUpdateIP = hasPermission(user, Permissions.IP_UPDATE);
  const canDeleteIP = hasPermission(user, Permissions.IP_DELETE);

  // Không fetch dữ liệu nếu không có quyền IP_READ
  useEffect(() => {
    if (!canReadIP) {
      return;
    }
    fetchIPAddresses();
    fetchUnits();
  }, [searchTerm, statusFilter, unitIdFilter]);

  const fetchIPAddresses = async () => {
    console.log('[IPManagementPage] fetchIPAddresses called with:', { searchTerm, unitIdFilter, statusFilter });
    setLoading(true);
    try {
      const response = await ipService.getIPAddresses(1, 100, searchTerm || undefined, unitIdFilter || undefined, statusFilter || undefined);
      console.log('[IPManagementPage] fetchIPAddresses response:', response.items.length, 'items');
      setIPAddresses(response.items);
    } catch (error: any) {
      console.error('[IPManagementPage] fetchIPAddresses error:', error);
      message.error('Failed to fetch IP addresses: ' + (error?.response?.data?.message || error?.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await unitService.getAllUnits();
      setUnits(response.map((u: Unit) => ({ id: u.id, name: u.name })));
    } catch (error) {
      console.error('Failed to fetch units:', error);
    }
  };

  const handleAdd = () => {
    if (!canCreateIP) {
      message.error('Bạn không có quyền thêm IP Address');
      return;
    }
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: IPAddress) => {
    if (!canUpdateIP) {
      message.error('Bạn không có quyền sửa IP Address');
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
      message.error('Bạn không có quyền xóa IP Address');
      return;
    }
    try {
      await ipService.deleteIPAddress(id);
      message.success('IP address deleted successfully');
      fetchIPAddresses();
    } catch (error) {
      message.error('Failed to delete IP address');
    }
  };

  const handleSubmit = async (values: IPAddressCreateRequest | IPAddressUpdateRequest) => {
    try {
      if (editingId) {
        await ipService.updateIPAddress(editingId, values as IPAddressUpdateRequest);
        message.success('IP address updated successfully');
      } else {
        await ipService.createIPAddress(values as IPAddressCreateRequest);
        message.success('IP address created successfully');
      }
      setModalVisible(false);
      fetchIPAddresses();
    } catch (error: any) {
      console.error('Failed to save IP address:', error);
      if (error?.response?.status === 400 && error?.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = Object.entries(errors).map(([_field, fieldErrors]) => 
          Array.isArray(fieldErrors) ? fieldErrors.join(', ') : String(fieldErrors)
        ).join('; ');
        message.error('Validation error: ' + errorMessages);
      } else {
        message.error('Failed to save IP address: ' + (error?.response?.data?.message || error?.message || 'Unknown error'));
      }
    }
  };

  const columns = [
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 150,
      sorter: (a: IPAddress, b: IPAddress) => a.ipAddress.localeCompare(b.ipAddress),
    },
    {
      title: 'MAC Address',
      dataIndex: 'macAddress',
      key: 'macAddress',
      width: 150,
      render: (mac: string | undefined) => mac || '-',
    },
    {
      title: 'Device Name',
      dataIndex: 'deviceName',
      key: 'deviceName',
      width: 150,
      render: (name: string | undefined) => name || '-',
    },
    {
      title: 'Device Type',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 120,
      render: (type: string | undefined) => type || '-',
    },
    {
      title: 'Port',
      dataIndex: 'port',
      key: 'port',
      width: 80,
      render: (port: string | undefined) => port || '-',
    },
    {
      title: 'Unit',
      dataIndex: 'unitName',
      key: 'unitName',
      width: 150,
      render: (unitName: string | undefined) => unitName || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'Active' ? 'green' : status === 'Reserved' ? 'orange' : 'red'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string | undefined) => date ? format(new Date(date), 'dd/MM/yyyy HH:mm') : '-',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center' as const,
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: IPAddress) => {
        const actions = [];
        
        if (canUpdateIP) {
          actions.push(
            <Button key="edit" icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" />
          );
        }
        
        if (canDeleteIP) {
          actions.push(
            <Popconfirm
              key="delete"
              title="Xóa IP Address"
              description="Bạn có chắc muốn xóa IP này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button icon={<DeleteOutlined />} danger size="small" />
            </Popconfirm>
          );
        }
        
        return <Space>{actions}</Space>;
      },
    },
  ];

  // Nếu không có quyền IP_READ, hiển thị thông báo
  if (!canReadIP) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <h2 style={{ color: '#ff4d4f', marginBottom: '16px' }}>Không có quyền truy cập</h2>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            Bạn không có quyền xem danh sách IP Address. Vui lòng liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { title: 'Dashboard', href: '/' },
          { title: 'Quản lý IP Addresses' },
        ]}
        style={{ marginBottom: 16 }}
      />

      <Card>
        <Title level={2} style={{ margin: 0, marginBottom: 16 }}>
          Quản lý IP Addresses
        </Title>

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap>
            <Search
              placeholder="Tìm kiếm theo IP, MAC, tên thiết bị..."
              allowClear
              onSearch={setSearchTerm}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
            <Select
              placeholder="Lọc theo trạng thái"
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
            >
              <Select.Option value="Active">Active</Select.Option>
              <Select.Option value="Reserved">Reserved</Select.Option>
              <Select.Option value="Inactive">Inactive</Select.Option>
            </Select>
            <Select
              placeholder="Lọc theo đơn vị"
              allowClear
              value={unitIdFilter}
              onChange={(value) => setUnitIdFilter(value || null)}
              style={{ width: 200 }}
            >
              {units.map(unit => (
                <Select.Option key={unit.id} value={unit.id}>{unit.name}</Select.Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={fetchIPAddresses}>
              Làm mới
            </Button>
          </Space>

          <Table
            columns={columns}
            dataSource={ipAddresses}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
            footer={() => (
              <Space style={{ justifyContent: 'space-between' }}>
                <span>Tổng số: {ipAddresses.length} IP addresses</span>
                {canCreateIP && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Thêm IP Address
                  </Button>
                )}
              </Space>
            )}
          />
        </Space>
      </Card>

      <Modal
        title={editingId ? 'Sửa IP Address' : 'Thêm IP Address'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
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
            name="unitId"
            label="Đơn vị"
            rules={[{ required: true, message: 'Vui lòng chọn đơn vị' }]}
          >
            <Select placeholder="Chọn đơn vị" showSearch optionFilterProp="children">
              {units.map(unit => (
                <Select.Option key={unit.id} value={unit.id}>{unit.name}</Select.Option>
              ))}
            </Select>
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
            <Input placeholder="e.g., 8080" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
          >
            <Select placeholder="Chọn trạng thái">
              <Select.Option value="Active">Active</Select.Option>
              <Select.Option value="Reserved">Reserved</Select.Option>
              <Select.Option value="Inactive">Inactive</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
          >
            <Input.TextArea placeholder="Nhập mô tả (tùy chọn)" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default IPManagementPage;