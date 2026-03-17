import { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Tag, Card, Row, Col, Typography, Breadcrumb, Dropdown, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LinkOutlined, MoreOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { networkSystemService } from '../services/networkSystem.service';
import type { NetworkSystem, NetworkSystemCreateRequest, NetworkSystemUpdateRequest, NetworkSystemListResponse } from '../types/networkSystem';
import type { IPAddress } from '../types/ip';
import { useAppSelector } from '../hooks/useAppSelector';
import { hasPermission, Permissions } from '../utils/permissions';

const { Title } = Typography;

const NetworkSystemPage = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  
  const [networkSystems, setNetworkSystems] = useState<NetworkSystem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [ipAssignModalVisible, setIpAssignModalVisible] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const [availableIps, setAvailableIps] = useState<IPAddress[]>([]);

  const canCreate = useMemo(() => user ? hasPermission(user, Permissions.NETWORK_SYSTEM_CREATE) : false, [user]);
  const canUpdate = useMemo(() => user ? hasPermission(user, Permissions.NETWORK_SYSTEM_UPDATE) : false, [user]);
  const canDelete = useMemo(() => user ? hasPermission(user, Permissions.NETWORK_SYSTEM_DELETE) : false, [user]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNetworkSystems();
    }
  }, [isAuthenticated]);

  const fetchNetworkSystems = async () => {
    setLoading(true);
    try {
      const response = await networkSystemService.getNetworkSystems(1, 100, undefined, undefined);
      setNetworkSystems(response.items);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch network systems';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!canCreate) {
      message.error('Bạn không có quyền thêm hệ thống mạng');
      return;
    }
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: NetworkSystem) => {
    if (!canUpdate) {
      message.error('Bạn không có quyền chỉnh sửa hệ thống mạng');
      return;
    }
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    if (!canDelete) {
      message.error('Bạn không có quyền xóa hệ thống mạng');
      return;
    }
    try {
      await networkSystemService.deleteNetworkSystem(id);
      message.success('Hệ thống mạng đã được xóa');
      fetchNetworkSystems();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete network system';
      message.error(errorMessage);
    }
  };

  const handleSubmit = async (values: NetworkSystemCreateRequest | NetworkSystemUpdateRequest) => {
    try {
      if (editingId) {
        await networkSystemService.updateNetworkSystem(editingId, values as NetworkSystemUpdateRequest);
        message.success('Hệ thống mạng đã được cập nhật');
      } else {
        await networkSystemService.createNetworkSystem(values as NetworkSystemCreateRequest);
        message.success('Hệ thống mạng đã được tạo');
      }
      setModalVisible(false);
      form.resetFields();
      fetchNetworkSystems();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save network system';
      message.error(errorMessage);
    }
  };

  const handleOpenIpAssignModal = async (systemId: number) => {
    if (!canUpdate) {
      message.error('Bạn không có quyền gán IP');
      return;
    }
    setSelectedSystemId(systemId);
    try {
      const ips = await networkSystemService.getAvailableIpAddresses(systemId);
      setAvailableIps(ips.map(ip => ({
        ...ip.ipAddresses[0],
        unitName: ip.ipAddresses[0].unitName || 'N/A'
      })));
      setIpAssignModalVisible(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch available IPs';
      message.error(errorMessage);
    }
  };

  const handleAssignIp = async (ipId: number) => {
    if (!selectedSystemId) return;
    try {
      await networkSystemService.assignIpAddress({
        networkSystemId: selectedSystemId,
        ipAddressId: ipId
      });
      message.success('Đã gán IP vào hệ thống');
      setIpAssignModalVisible(false);
      fetchNetworkSystems();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign IP';
      message.error(errorMessage);
    }
  };

  const handleRemoveIp = async (systemId: number, ipId: number) => {
    if (!canUpdate) {
      message.error('Bạn không có quyền gỡ IP');
      return;
    }
    try {
      await networkSystemService.removeIpAddress({
        networkSystemId: systemId,
        ipAddressId: ipId
      });
      message.success('Đã gỡ IP khỏi hệ thống');
      fetchNetworkSystems();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove IP';
      message.error(errorMessage);
    }
  };

  // Filter network systems
  const filteredNetworkSystems = useMemo(() => {
    return networkSystems.filter((system) => {
      const matchesKeyword =
        !searchKeyword ||
        system.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        system.code?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        system.description?.toLowerCase().includes(searchKeyword.toLowerCase());

      const matchesStatus = !statusFilter || system.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [networkSystems, searchKeyword, statusFilter]);

  const columns = [
    {
      title: 'Tên hệ thống',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      render: (code: string | undefined) => code || '-',
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string | undefined) => desc || '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'Active' ? 'green' : status === 'Inactive' ? 'red' : 'default';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Số IP',
      dataIndex: 'ipAddresses',
      key: 'ipAddresses',
      render: (ips: IPAddress[]) => <Tag color="blue">{ips.length}</Tag>,
    },
    {
      title: 'Hành động',
      key: 'actions',
      align: 'center' as const,
      width: 150,
      render: (_: unknown, record: NetworkSystem) => {
        const items = [
          {
            key: 'assign-ip',
            label: 'Gán IP',
            icon: <LinkOutlined />,
            onClick: () => handleOpenIpAssignModal(record.id),
            disabled: !canUpdate,
          },
          {
            key: 'edit',
            label: 'Sửa',
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
            disabled: !canUpdate,
          },
          {
            key: 'delete',
            label: 'Xóa',
            icon: <DeleteOutlined />,
            onClick: () => {
              if (canDelete) {
                if (window.confirm('Bạn có chắc chắn muốn xóa hệ thống mạng này?')) {
                  handleDelete(record.id);
                }
              }
            },
            disabled: !canDelete,
          },
        ];

        return (
          <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']} getPopupContainer={(_trigger) => document.body}>
            <Button icon={<MoreOutlined />} size="small" type="text" />
          </Dropdown>
        );
      },
    },
  ];

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Card>
          <Title level={4}>Đang kiểm tra quyền...</Title>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card className="responsive-card">
        <Breadcrumb
          items={[
            { title: 'Dashboard', href: '/' },
            { title: 'Quản lý hệ thống mạng' },
          ]}
          style={{ marginBottom: 16 }}
          separator=">"
        />

        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={24} md={16} lg={18}>
            <Title level={3} style={{ margin: 0 }}>Quản lý hệ thống mạng</Title>
          </Col>
          <Col xs={24} sm={24} md={8} lg={6}>
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} block>
                Thêm hệ thống mạng
              </Button>
            )}
          </Col>
        </Row>

        {/* Search and Filter Bar */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={24} md={12} lg={8}>
            <Input
              placeholder="Tìm kiếm theo tên, mã, mô tả..."
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={24} md={12} lg={8}>
            <Select
              placeholder="Lọc theo trạng thái"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              allowClear
              style={{ width: '100%' }}
              options={[
                { value: 'Active', label: 'Hoạt động' },
                { value: 'Inactive', label: 'Không hoạt động' },
                { value: 'Maintenance', label: 'Bảo trì' },
              ]}
            />
          </Col>
        </Row>

        {isMobile ? (
          <div style={{ marginTop: 16 }}>
            {filteredNetworkSystems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                {networkSystems.length === 0 ? 'Không có hệ thống mạng nào' : 'Không có kết quả phù hợp'}
              </div>
            ) : (
              filteredNetworkSystems.map((system) => (
                <Card key={system.id} size="small" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>{system.name}</strong>
                    <Tag color={system.status === 'Active' ? 'green' : 'red'}>{system.status}</Tag>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <small>Mã: {system.code || '-'}</small>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <small>Mô tả: {system.description || '-'}</small>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <small>Số IP: {system.ipAddresses.length}</small>
                  </div>
                  <Space>
                    {canUpdate && (
                      <Button size="small" icon={<LinkOutlined />} onClick={() => handleOpenIpAssignModal(system.id)}>
                        Gán IP
                      </Button>
                    )}
                    {canUpdate && (
                      <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(system)}>
                        Sửa
                      </Button>
                    )}
                    {canDelete && (
                      <Popconfirm
                        title="Xóa hệ thống mạng"
                        description="Bạn có chắc chắn muốn xóa?"
                        onConfirm={() => handleDelete(system.id)}
                        okText="Có"
                        cancelText="Không"
                      >
                        <Button size="small" icon={<DeleteOutlined />} danger>
                          Xóa
                        </Button>
                      </Popconfirm>
                    )}
                  </Space>
                </Card>
              ))
            )}
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredNetworkSystems}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 1000 }}
            size="small"
          />
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingId ? 'Sửa hệ thống mạng' : 'Thêm hệ thống mạng'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Tên hệ thống"
            rules={[{ required: true, message: 'Vui lòng nhập tên hệ thống' }]}
          >
            <Input placeholder="Nhập tên hệ thống" />
          </Form.Item>

          <Form.Item
            name="code"
            label="Mã hệ thống"
          >
            <Input placeholder="Nhập mã hệ thống" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
          >
            <Input.TextArea rows={3} placeholder="Nhập mô tả" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
          >
            <Select>
              <Select.Option value="Active">Hoạt động</Select.Option>
              <Select.Option value="Inactive">Không hoạt động</Select.Option>
              <Select.Option value="Maintenance">Bảo trì</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* IP Assign Modal */}
      <Modal
        title="Gán IP vào hệ thống"
        open={ipAssignModalVisible}
        onCancel={() => setIpAssignModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          dataSource={availableIps}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="small"
          columns={[
            {
              title: 'IP Address',
              dataIndex: 'ipAddress',
              key: 'ipAddress',
            },
            {
              title: 'Thiết bị',
              dataIndex: 'deviceName',
              key: 'deviceName',
              render: (name: string | undefined) => name || '-',
            },
            {
              title: 'Loại',
              dataIndex: 'deviceType',
              key: 'deviceType',
              render: (type: string | undefined) => type || '-',
            },
            {
              title: 'Đơn vị',
              dataIndex: 'unitName',
              key: 'unitName',
              render: (name: string | undefined) => name || '-',
            },
            {
              title: 'Hành động',
              key: 'action',
              render: (_: unknown, record: IPAddress) => (
                <Button
                  size="small"
                  icon={<LinkOutlined />}
                  onClick={() => handleAssignIp(record.id)}
                >
                  Gán
                </Button>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default NetworkSystemPage;