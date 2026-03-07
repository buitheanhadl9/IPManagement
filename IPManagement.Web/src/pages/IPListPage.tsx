import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm, Row, Col, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { IPAddress, IPAddressCreateRequest, IPAddressUpdateRequest } from '../types/ip';
import { ipService } from '../services/ip.service';
import { unitService } from '../services/unit.service';
import type { Unit } from '../types/unit';
import UnitTreeComponent from '../components/UnitTree';
import { useAppSelector } from '../hooks/useAppSelector';
import { hasPermission, Permissions } from '../utils/permissions';

const IPListPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  
  // Debug: Log user info
  useEffect(() => {
    console.log('=== IPListPage User Info ===');
    console.log('User:', user);
    console.log('User roles:', user?.roles);
  }, [user]);
  const [ipAddresses, setIPAddresses] = useState<IPAddress[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [selectedUnitName, setSelectedUnitName] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Check permissions
  console.log('=== IPListPage User Info ===');
  console.log('User:', user);
  console.log('User roles:', user?.roles);
  const canCreateIP = hasPermission(user?.roles, Permissions.IP_CREATE);
  const canUpdateIP = hasPermission(user?.roles, Permissions.IP_UPDATE);
  const canDeleteIP = hasPermission(user?.roles, Permissions.IP_DELETE);
  console.log('canCreateIP:', canCreateIP, 'canUpdateIP:', canUpdateIP, 'canDeleteIP:', canDeleteIP);

  useEffect(() => {
    fetchIPAddresses();
    fetchUnits();
  }, [selectedUnitId]);

  const fetchUnits = async () => {
    try {
      const data = await unitService.getAllUnits();
      setUnits(data);
    } catch (error) {
      console.error('Failed to fetch units', error);
    }
  };

  const fetchIPAddresses = async () => {
    setLoading(true);
    try {
      const response = await ipService.getIPAddresses(1, 100, undefined, selectedUnitId || undefined);
      setIPAddresses(response.items);
    } catch {
      message.error('Failed to fetch IP addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleUnitSelect = (unitId: number | null, unitName: string | null) => {
    setSelectedUnitId(unitId);
    setSelectedUnitName(unitName);
  };

  const handleAdd = () => {
    if (!canCreateIP) {
      message.error('Bạn không có quyền thêm IP');
      return;
    }
    setEditingId(null);
    form.resetFields();
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
    } catch {
      message.error('Failed to save IP address');
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
        <span style={{ color: status === 'Active' ? 'green' : 'red' }}>
          {status}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: IPAddress) => (
        <Space>
          {canUpdateIP && (
            <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" />
          )}
          {canDeleteIP && (
            <Popconfirm
              title="Delete IP Address"
              description="Are you sure to delete this IP address?"
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
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={6}>
          <Card title="Đơn vị">
            <UnitTreeComponent
              onUnitSelect={handleUnitSelect}
              selectedUnitId={selectedUnitId}
            />
          </Card>
        </Col>
        <Col xs={24} lg={18}>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h2 style={{ margin: 0 }}>IP Addresses</h2>
                  {selectedUnitName && (
                    <p style={{ margin: '8px 0 0 0', color: '#666' }}>
                      Đơn vị đã chọn: <strong>{selectedUnitName}</strong>
                    </p>
                  )}
                </div>
                {canCreateIP && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Add IP Address
                  </Button>
                )}
              </div>
            </div>

            <Table
              columns={columns}
              dataSource={ipAddresses}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ x: 800 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingId ? 'Edit IP Address' : 'Add IP Address'}
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
              { required: true, message: 'Please enter IP address' },
              { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'Invalid IP address format' },
            ]}
          >
            <Input placeholder="e.g., 192.168.1.1" />
          </Form.Item>

          <Form.Item
            name="macAddress"
            label="MAC Address"
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
            <Select placeholder="Select device type" allowClear>
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
            name="unitId"
            label="Unit"
            rules={[{ required: true, message: 'Please select a unit' }]}
          >
            <Select placeholder="Select a unit" showSearch optionFilterProp="children">
              {units.map((unit) => (
                <Select.Option key={unit.id} value={unit.id}>
                  {unit.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select placeholder="Select status">
              <Select.Option value="Active">Active</Select.Option>
              <Select.Option value="Inactive">Inactive</Select.Option>
              <Select.Option value="Reserved">Reserved</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} placeholder="Enter description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default IPListPage;