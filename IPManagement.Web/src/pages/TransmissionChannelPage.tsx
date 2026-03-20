import { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Tag, Card, Breadcrumb, Switch, InputNumber, Typography, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, WifiOutlined, HomeOutlined } from '@ant-design/icons';
import type { TransmissionChannel, TransmissionChannelCreateRequest, TransmissionChannelUpdateRequest } from '../types/transmissionChannel';
import { transmissionChannelService } from '../services/transmissionChannel.service';
import { unitService } from '../services/unit.service';
import type { UnitSelectionDto } from '../types/unit';
import { useAppSelector } from '../hooks/useAppSelector';
import { hasPermission, Permissions } from '../utils/permissions';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;
const { Option } = Select;

const TransmissionChannelPage = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  
  const [channels, setChannels] = useState<TransmissionChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [units, setUnits] = useState<UnitSelectionDto[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const canCreate = useMemo(() => user ? hasPermission(user, Permissions.TRANSMISSION_CHANNEL_CREATE) : false, [user]);
  const canUpdate = useMemo(() => user ? hasPermission(user, Permissions.TRANSMISSION_CHANNEL_UPDATE) : false, [user]);
  const canDelete = useMemo(() => user ? hasPermission(user, Permissions.TRANSMISSION_CHANNEL_DELETE) : false, [user]);
  const canView = useMemo(() => user ? hasPermission(user, Permissions.TRANSMISSION_CHANNEL_READ) : false, [user]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isAuthenticated && canView) {
      loadChannels();
    }
  }, [isAuthenticated, canView]);

  useEffect(() => {
    if (modalVisible && units.length === 0) {
      loadUnits();
    }
  }, [modalVisible]);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const data = await transmissionChannelService.getAll();
      setChannels(data);
    } catch (error) {
      console.error('Failed to load channels:', error);
      message.error('Không thể tải danh sách kênh truyền');
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async () => {
    setUnitsLoading(true);
    try {
      const data = await unitService.getAllUnitsForSelection();
      setUnits(data);
    } catch (error) {
      console.error('Failed to load units:', error);
      message.error('Không thể tải danh sách đơn vị');
    } finally {
      setUnitsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: TransmissionChannel) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      unitIds: record.units.map(u => u.id),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await transmissionChannelService.delete(id);
      message.success('Xóa kênh truyền thành công');
      loadChannels();
    } catch (error) {
      console.error('Failed to delete channel:', error);
      message.error('Không thể xóa kênh truyền');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const data: TransmissionChannelCreateRequest | TransmissionChannelUpdateRequest = {
        code: values.code,
        provider: values.provider,
        bandwidth: values.bandwidth,
        vlanId: values.vlanId,
        ipRangeStart: values.ipRangeStart,
        ipRangeEnd: values.ipRangeEnd,
        subnet: values.subnet,
        gateway: values.gateway,
        unitIds: values.unitIds,
      };

      if (editingId !== null) {
        (data as TransmissionChannelUpdateRequest).isActive = values.isActive;
        await transmissionChannelService.update(editingId, data as TransmissionChannelUpdateRequest);
        message.success('Cập nhật kênh truyền thành công');
      } else {
        await transmissionChannelService.create(data as TransmissionChannelCreateRequest);
        message.success('Tạo kênh truyền thành công');
      }

      setModalVisible(false);
      form.resetFields();
      loadChannels();
    } catch (error: any) {
      console.error('Failed to save channel:', error);
      message.error(error.response?.data?.message || 'Không thể lưu kênh truyền');
    }
  };

  const columns = [
    {
      title: 'Mã kênh',
      dataIndex: 'code',
      key: 'code',
      sorter: (a: TransmissionChannel, b: TransmissionChannel) => a.code.localeCompare(b.code),
    },
    {
      title: 'Nhà mạng',
      dataIndex: 'provider',
      key: 'provider',
      filters: [
        { text: 'VNPT', value: 'VNPT' },
        { text: 'CAT', value: 'CAT' },
        { text: 'FPT', value: 'FPT' },
        { text: 'Viettel', value: 'Viettel' },
        { text: 'Mobifone', value: 'Mobifone' },
        { text: 'Gtel', value: 'Gtel' },
        { text: 'Khác', value: 'Khác' },
      ],
      onFilter: (value: string, record: TransmissionChannel) => record.provider === value,
    },
    {
      title: 'Băng thông',
      dataIndex: 'bandwidth',
      key: 'bandwidth',
      render: (bandwidth: number) => `${bandwidth} Mbps`,
      sorter: (a: TransmissionChannel, b: TransmissionChannel) => a.bandwidth - b.bandwidth,
    },
    {
      title: 'VLAN ID',
      dataIndex: 'vlanId',
      key: 'vlanId',
      sorter: (a: TransmissionChannel, b: TransmissionChannel) => a.vlanId - b.vlanId,
    },
    {
      title: 'Dải IP',
      key: 'ipRange',
      render: (_: any, record: TransmissionChannel) => (
        <span>
          {record.ipRangeStart} - {record.ipRangeEnd}
        </span>
      ),
    },
    {
      title: 'Gateway',
      dataIndex: 'gateway',
      key: 'gateway',
    },
    {
      title: 'Đơn vị',
      key: 'unitCount',
      render: (_: any, record: TransmissionChannel) => (
        <Tag icon={<HomeOutlined />}>{record.unitCount} đơn vị</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Không hoạt động'}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: any, record: TransmissionChannel) => (
        <Space size="small">
          {canUpdate && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              Sửa
            </Button>
          )}
          {canDelete && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            >
              Xóa
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <Breadcrumb
        items={[
          { title: 'Trang chủ', onClick: () => navigate('/') },
          { title: 'Kênh truyền' },
        ]}
        style={{ marginBottom: 16 }}
      />
      
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            <WifiOutlined style={{ marginRight: 8 }} />
            Quản lý kênh truyền
          </Title>
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Tạo mới
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={channels}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} kênh`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingId ? 'Sửa kênh truyền' : 'Tạo kênh truyền mới'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="Mã kênh"
            name="code"
            rules={[{ required: true, message: 'Vui lòng nhập mã kênh' }]}
          >
            <Input placeholder="Ví dụ: KC-VNPT-001" />
          </Form.Item>

          <Form.Item
            label="Nhà mạng"
            name="provider"
            rules={[{ required: true, message: 'Vui lòng chọn nhà mạng' }]}
          >
            <Select placeholder="Chọn nhà mạng">
              <Option value="VNPT">VNPT</Option>
              <Option value="CAT">CAT</Option>
              <Option value="FPT">FPT</Option>
              <Option value="Viettel">Viettel</Option>
              <Option value="Mobifone">Mobifone</Option>
              <Option value="Gtel">Gtel</Option>
              <Option value="Khác">Khác</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Băng thông (Mbps)"
                name="bandwidth"
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="Ví dụ: 100" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="VLAN ID"
                name="vlanId"
              >
                <InputNumber min={1} max={4094} style={{ width: '100%' }} placeholder="Ví dụ: 100" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="IP bắt đầu"
                name="ipRangeStart"
                rules={[{ required: true, message: 'Vui lòng nhập IP bắt đầu' }]}
              >
                <Input placeholder="Ví dụ: 10.97.5.5" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="IP kết thúc"
                name="ipRangeEnd"
                rules={[{ required: true, message: 'Vui lòng nhập IP kết thúc' }]}
              >
                <Input placeholder="Ví dụ: 10.97.5.254" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Subnet"
                name="subnet"
                rules={[{ required: true, message: 'Vui lòng nhập subnet' }]}
              >
                <Input placeholder="Ví dụ: 255.255.255.0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Gateway"
                name="gateway"
                rules={[{ required: true, message: 'Vui lòng nhập gateway' }]}
              >
                <Input placeholder="Ví dụ: 10.97.5.1" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Đơn vị"
            name="unitIds"
          >
            <Select
              mode="multiple"
              placeholder="Chọn đơn vị (tùy chọn)"
              loading={unitsLoading}
              style={{ width: '100%' }}
            >
              {units.map((unit) => (
                <Option key={unit.id} value={unit.id}>
                  {unit.code ? `[${unit.code}] ${unit.name}` : unit.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {editingId !== null && (
            <Form.Item
              label="Trạng thái"
              name="isActive"
              valuePropName="checked"
            >
              <Switch checkedChildren="Hoạt động" unCheckedChildren="Không hoạt động" />
            </Form.Item>
          )}

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingId ? 'Cập nhật' : 'Tạo mới'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TransmissionChannelPage;