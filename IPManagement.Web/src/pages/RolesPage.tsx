import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Tag, Card, Row, Col, Typography, Breadcrumb, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { roleService } from '../services/role.service';
import type { Role, CreateRoleRequest } from '../types/role';
import { useAppSelector } from '../hooks/useAppSelector';
import { isAdmin } from '../utils/permissions';

const { Title } = Typography;

const RolesPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Chỉ Admin mới được vào trang này
  if (!isAdmin(user?.roles)) {
    return (
      <div>
        <Title level={2}>Không có quyền truy cập</Title>
        <p>Chỉ Admin mới được truy cập trang quản lý role.</p>
      </div>
    );
  }

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await roleService.getAllRoles();
      setRoles(data);
    } catch (error: any) {
      message.error('Failed to fetch roles: ' + (error?.response?.data?.message || error?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Role) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      description: record.description || '',
    });
    setModalVisible(true);
  };

  const handleDelete = async (roleId: string, roleName: string) => {
    // Không cho phép xóa các role mặc định
    if (['Admin', 'UnitAdmin', 'User'].includes(roleName)) {
      message.error('Không thể xóa các role mặc định của hệ thống');
      return;
    }

    try {
      await roleService.deleteRole(roleId);
      message.success('Role deleted successfully');
      fetchRoles();
    } catch (error: any) {
      message.error('Failed to delete role: ' + (error?.response?.data?.message || error?.message));
    }
  };

  const handleSubmit = async (values: CreateRoleRequest) => {
    try {
      if (editingId) {
        await roleService.updateRole(editingId, values);
        message.success('Role updated successfully');
      } else {
        await roleService.createRole(values);
        message.success('Role created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      fetchRoles();
    } catch (error: any) {
      console.error('Failed to save role:', error);
      message.error('Failed to save role: ' + (error?.response?.data?.message || error?.message));
    }
  };

  const columns = [
    {
      title: 'Role Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => (
        <Tag color={name === 'Admin' ? 'red' : name === 'UnitAdmin' ? 'blue' : 'green'}>
          {name}
        </Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      render: (desc: string | null) => desc || '-',
    },
    {
      title: 'User Count',
      dataIndex: 'userCount',
      key: 'userCount',
      width: 120,
      align: 'center' as const,
      render: (count: number) => (
        <Space>
          <UserOutlined />
          {count}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, record: Role) => (
        <Space>
          {/* Không cho phép chỉnh sửa role mặc định */}
          {!['Admin', 'UnitAdmin', 'User'].includes(record.name) && (
            <>
              <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" />
              <Popconfirm
                title="Delete Role"
                description="Are you sure you want to delete this role?"
                onConfirm={() => handleDelete(record.id, record.name)}
                okText="Yes"
                cancelText="No"
              >
                <Button icon={<DeleteOutlined />} danger size="small" />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb
        items={[
          { title: 'Dashboard', href: '/' },
          { title: 'Role Management' },
        ]}
        style={{ marginBottom: 16 }}
      />

      <Card className="responsive-card">
        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={24} md={12} lg={10}>
            <Title level={3} style={{ margin: 0, marginBottom: 0 }}>Role Management</Title>
          </Col>
          <Col xs={24} sm={24} md={12} lg={14}>
            <Space direction="horizontal" wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                Add Role
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 800 }}
        />
      </Card>

      <Modal
        title={editingId ? 'Edit Role' : 'Add Role'}
        open={modalVisible}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        onOk={() => form.submit()}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Role Name"
            rules={[
              { required: true, message: 'Please enter role name' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: 'Role name can only contain letters, numbers, and underscores' },
            ]}
          >
            <Input placeholder="Enter role name (e.g., Manager)" disabled={!!editingId} />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea placeholder="Enter role description" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RolesPage;