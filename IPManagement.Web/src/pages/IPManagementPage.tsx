import { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Tag, message, Card, Breadcrumb, Typography, Popconfirm, Select, Modal, Form, Divider, Row, Col, Dropdown } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined, WifiOutlined, BarcodeOutlined, DesktopOutlined, EnvironmentOutlined, LaptopOutlined, ToolOutlined } from '@ant-design/icons';
import type { IPAddress, IPAddressCreateRequest, IPAddressUpdateRequest } from '../types/ip';
import { ipService } from '../services/ip.service';
import { unitService } from '../services/unit.service';
import type { Unit } from '../types/unit';
import { format } from 'date-fns';
import { useAppSelector } from '../hooks/useAppSelector';
import { hasPermission, Permissions } from '../utils/permissions';
import TruncatedDescription from '../components/TruncatedDescription';
import type { NetworkSystem } from '../types/networkSystem';
import { networkSystemService } from '../services/networkSystem.service';

const { Title } = Typography;
const { Search } = Input;

const IPManagementPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [ipAddresses, setIPAddresses] = useState<IPAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [unitIdFilter, setUnitIdFilter] = useState<number | null>(null);
  const [units, setUnits] = useState<{ id: number; name: string; parentUnitName?: string }[]>([]);
  const [networkSystems, setNetworkSystems] = useState<NetworkSystem[]>([]);
  const [networkSystemsLoading, setNetworkSystemsLoading] = useState(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [current_page, setCurrentPage] = useState<number>(1);
  
  // Check permissions (dùng Unified Roles - level cao nhất trong units áp dụng toàn hệ thống)
  // Chỉ check permission khi đã load xong user
  const canReadIP = user ? hasPermission(user, Permissions.IP_READ) : false;
  const canCreateIP = user ? hasPermission(user, Permissions.IP_CREATE) : false;
  const canUpdateIP = user ? hasPermission(user, Permissions.IP_UPDATE) : false;
  const canDeleteIP = user ? hasPermission(user, Permissions.IP_DELETE) : false;

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Không fetch dữ liệu nếu không có quyền IP_READ
  useEffect(() => {
    if (!canReadIP) {
      return;
    }
    fetchIPAddresses();
    fetchUnits();
  }, [searchTerm, statusFilter, unitIdFilter, canReadIP]);

  const fetchIPAddresses = async () => {
    setLoading(true);
    try {
      const response = await ipService.getIPAddresses(1, 100, searchTerm || undefined, unitIdFilter || undefined, statusFilter || undefined);
      setIPAddresses(response.items);
    } catch (error: any) {
      message.error('Failed to fetch IP addresses: ' + (error?.response?.data?.message || error?.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await unitService.getAllUnits();
      setUnits(response.map((u: Unit) => ({ id: u.id, name: u.name, parentUnitName: u.parentUnitName })));
    } catch (error) {
      console.error('Failed to fetch units:', error);
    }
  };

  const fetchNetworkSystems = async () => {
    setNetworkSystemsLoading(true);
    try {
      const response = await networkSystemService.getNetworkSystems(1, 100, undefined, 'Active');
      setNetworkSystems(response.items);
    } catch (error) {
      console.error('Failed to fetch network systems:', error);
    } finally {
      setNetworkSystemsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!canCreateIP) {
      message.error('Bạn không có quyền thêm IP Address');
      return;
    }
    setEditingId(null);
    form.resetFields();
    await fetchNetworkSystems();
    setModalVisible(true);
  };

  const handleEdit = async (record: IPAddress) => {
    if (!canUpdateIP) {
      message.error('Bạn không có quyền sửa IP Address');
      return;
    }
    setEditingId(record.id);
    await fetchNetworkSystems();
    form.setFieldsValue({
      ipAddress: record.ipAddress,
      macAddress: record.macAddress,
      deviceName: record.deviceName,
      deviceType: record.deviceType,
      port: record.port,
      unitId: record.unitId,
      status: record.status,
      description: record.description,
      networkSystemId: record.networkSystemId,
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

  const columns: any[] = [
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 150,
      sorter: (a: IPAddress, b: IPAddress) => a.ipAddress.localeCompare(b.ipAddress),
      resizable: true,
    },
    {
      title: 'MAC Address',
      dataIndex: 'macAddress',
      key: 'macAddress',
      width: 150,
      render: (mac: string | undefined) => mac || '-',
      resizable: true,
    },
    {
      title: 'Device Name',
      dataIndex: 'deviceName',
      key: 'deviceName',
      width: 150,
      render: (name: string | undefined) => name || '-',
      resizable: true,
    },
    {
      title: 'Device Type',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 120,
      render: (type: string | undefined) => type || '-',
      resizable: true,
    },
    {
      title: 'Port',
      dataIndex: 'port',
      key: 'port',
      width: 80,
      render: (port: string | undefined) => port || '-',
      resizable: true,
    },
    {
      title: 'Unit',
      dataIndex: 'unitName',
      key: 'unitName',
      width: 150,
      render: (unitName: string | undefined, record: IPAddress) => {
        if (!unitName) return '-';
        return record.parentUnitName ? `${unitName}, ${record.parentUnitName}` : unitName;
      },
      resizable: true,
    },
    {
      title: 'Hệ thống mạng',
      dataIndex: 'networkSystemName',
      key: 'networkSystemName',
      width: 150,
      render: (name: string | undefined) => name ? <Tag color="blue">{name}</Tag> : '-',
      resizable: true,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      render: (desc: string | undefined) => <TruncatedDescription description={desc} maxLength={20} />,
      resizable: true,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string | undefined) => date ? format(new Date(date), 'dd/MM/yyyy HH:mm') : '-',
      resizable: true,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center' as const,
      width: 100,
      fixed: 'right' as const,
      resizable: false,
      render: (_: unknown, record: IPAddress) => {
        const items = [
          {
            key: 'edit',
            label: 'Sửa',
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
            disabled: !canUpdateIP,
          },
          {
            key: 'delete',
            label: 'Xóa',
            icon: <DeleteOutlined />,
            onClick: () => {
              if (canDeleteIP) {
                if (window.confirm('Bạn có chắc chắn muốn xóa IP address này?')) {
                  handleDelete(record.id);
                }
              }
            },
            disabled: !canDeleteIP,
          },
        ];

        return (
          <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']} getPopupContainer={(_trigger) => document.body}>
            <Button icon={<ToolOutlined />} size="small" type="text" />
          </Dropdown>
        );
      },
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
                <BarcodeOutlined style={{ color: '#666', minWidth: 20 }} />
                <span>MAC: {ip.macAddress || '-'}</span>
              </Space>
              <Space>
                <DesktopOutlined style={{ color: '#666', minWidth: 20 }} />
                <span>Device: {ip.deviceName || '-'}</span>
              </Space>
              <Space>
                <LaptopOutlined style={{ color: '#666', minWidth: 20 }} />
                <span>Type: {ip.deviceType ? <Tag color={deviceTypeColor}>{ip.deviceType}</Tag> : '-'}</span>
              </Space>
              <Space>
                <EnvironmentOutlined style={{ color: '#666', minWidth: 20 }} />
                <span>Unit: {ip.unitName || '-'}</span>
              </Space>
              {ip.networkSystemName && (
                <Space>
                  <span>System: <Tag color="blue">{ip.networkSystemName}</Tag></span>
                </Space>
              )}
              {ip.port && (
                <Space>
                  <span>Port: {ip.port}</span>
                </Space>
              )}
              {ip.description && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: '#666' }}>Note:</span>
                  <TruncatedDescription description={ip.description} maxLength={20} />
                </div>
              )}
            </Space>
          </Col>
          
          <Col span={24}>
            <Divider style={{ margin: '8px 0' }} />
            {(() => {
              const items = [
                {
                  key: 'edit',
                  label: 'Sửa',
                  icon: <EditOutlined />,
                  onClick: () => handleEdit(ip),
                  disabled: !canUpdateIP,
                },
                {
                  key: 'delete',
                  label: 'Xóa',
                  icon: <DeleteOutlined />,
                  onClick: () => {
                    if (canDeleteIP) {
                      if (window.confirm('Bạn có chắc chắn muốn xóa IP address này?')) {
                        handleDelete(ip.id);
                      }
                    }
                  },
                  disabled: !canDeleteIP,
                },
              ];

              return (
                <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']} getPopupContainer={(_trigger) => document.body}>
                  <Button icon={<ToolOutlined />} size="small" type="text">
                    Hành động
                  </Button>
                </Dropdown>
              );
            })()}
          </Col>
        </Row>
      </Card>
    );
  };

  // Đang tải thông tin người dùng
  if (isLoading || !user) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '16px', color: '#666' }}>Đang tải...</p>
        </div>
      </div>
    );
  }

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
              placeholder="Trạng thái"
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
            >
              <Select.Option value="Active">Hoạt động</Select.Option>
              <Select.Option value="Reserved">Đã giữ</Select.Option>
              <Select.Option value="Inactive">Không hoạt động</Select.Option>
            </Select>
            <Select
              placeholder="Lọc theo đơn vị"
              allowClear
              value={unitIdFilter}
              onChange={(value) => setUnitIdFilter(value || null)}
              style={{ width: 200 }}
            >
              {units.map(unit => (
                <Select.Option key={unit.id} value={unit.id}>
                  {unit.parentUnitName ? `${unit.name}, ${unit.parentUnitName}` : unit.name}
                </Select.Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={fetchIPAddresses}>
              Làm mới
            </Button>
            {canCreateIP && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                Thêm IP Address
              </Button>
            )}
          </Space>

          {/* Mobile View - Card Layout */}
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
            /* Desktop View - Table Layout */
            <Table
              columns={columns}
              dataSource={ipAddresses}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: pageSize,
                pageSizeOptions: ['10', '20', '30', '50', '100'],
                showSizeChanger: true,
                showQuickJumper: true,
                current: current_page
              }}
              scroll={{ x: 1200 }}
              onChange={(pagination) => {
                const paginationObj = pagination as any;
                if (paginationObj.pageSize) {
                  setPageSize(paginationObj.pageSize);
                }
                if (paginationObj.current) {
                  setCurrentPage(paginationObj.current);
                }
              }}
              rowClassName={(record) => {
                // Check if this IP address is duplicated within the same unit
                const duplicateIPs = ipAddresses.filter(
                  (ip) => ip.ipAddress === record.ipAddress && ip.id !== record.id
                );
                return duplicateIPs.length > 0 ? 'duplicate-ip-row' : '';
              }}
              footer={() => (
                <span>Tổng số: {ipAddresses.length} IP addresses</span>
              )}
            />
          )}
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
                <Select.Option key={unit.id} value={unit.id}>
                  {unit.parentUnitName ? `${unit.name}, ${unit.parentUnitName}` : unit.name}
                </Select.Option>
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
            name="networkSystemId"
            label="Hệ thống mạng"
          >
            <Select 
              placeholder="Chọn hệ thống mạng (tùy chọn)" 
              allowClear
              loading={networkSystemsLoading}
            >
              {networkSystems.map((ns) => (
                <Select.Option key={ns.id} value={ns.id}>
                  {ns.name}
                </Select.Option>
              ))}
            </Select>
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