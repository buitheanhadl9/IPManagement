import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Tag, Card, Row, Col, Typography, Breadcrumb, Popconfirm, Checkbox, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, KeyOutlined } from '@ant-design/icons';
import { roleService } from '../services/role.service';
import { permissionService } from '../services/permission.service';
import type { Role, CreateRoleRequest } from '../types/role';
import { useAppSelector } from '../hooks/useAppSelector';
import { isAdmin, Permissions } from '../utils/permissions';

const { Title } = Typography;

// Define permission categories
const PERMISSION_CATEGORIES = {
  IP: {
    label: 'IP Address',
    permissions: [
      { key: Permissions.IP_CREATE, label: 'Create' },
      { key: Permissions.IP_READ, label: 'Read' },
      { key: Permissions.IP_UPDATE, label: 'Update' },
      { key: Permissions.IP_DELETE, label: 'Delete' },
    ]
  },
  UNIT: {
    label: 'Unit',
    permissions: [
      { key: Permissions.UNIT_CREATE, label: 'Create' },
      { key: Permissions.UNIT_READ, label: 'Read' },
      { key: Permissions.UNIT_UPDATE, label: 'Update' },
      { key: Permissions.UNIT_DELETE, label: 'Delete' },
    ]
  },
  USER: {
    label: 'User',
    permissions: [
      { key: Permissions.USER_CREATE, label: 'Create' },
      { key: Permissions.USER_READ, label: 'Read' },
      { key: Permissions.USER_UPDATE, label: 'Update' },
      { key: Permissions.USER_DELETE, label: 'Delete' },
    ]
  },
  ROLE: {
    label: 'Role',
    permissions: [
      { key: Permissions.ROLE_CREATE, label: 'Create' },
      { key: Permissions.ROLE_READ, label: 'Read' },
      { key: Permissions.ROLE_UPDATE, label: 'Update' },
      { key: Permissions.ROLE_DELETE, label: 'Delete' },
    ]
  },
  AUDIT: {
    label: 'Audit Log',
    permissions: [
      { key: Permissions.AUDIT_READ, label: 'Read' },
    ]
  },
};

const RolesPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionsModalVisible, setPermissionsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();
  const [permissionsForm] = Form.useForm();
  // const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // Chỉ Admin mới được vào trang này
  if (!isAdmin(user)) {
    return (
      <div>
        <Title level={2}>Không có quyền truy cập</Title>
        <p>Chỉ Admin mới được truy cập trang quản lý role.</p>
      </div>
    );
  }

  useEffect(() => {
    fetchRoles();
    // fetchAllPermissions();
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

  // const fetchAllPermissions = async () => {
  //   try {
  //     const permissions = await permissionService.getAllAvailablePermissions();
  //     setAllPermissions(permissions);
  //   } catch (error: any) {
  //     console.error('Failed to fetch all permissions:', error);
  //   }
  // };

  const handleAdd = () => {
    setEditingId(null);
    setEditingRole(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Role) => {
    setEditingId(record.id);
    setEditingRole(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description || '',
    });
    setModalVisible(true);
  };

  const handleManagePermissions = async (record: Role) => {
    setEditingRole(record);
    setPermissionsLoading(true);
    try {
      const permissions = await permissionService.getRolePermissionsById(record.id);
      // Tạo object với các permission được tích (value = true)
      const permissionValues: Record<string, boolean> = {};
      permissions.forEach((perm: string) => {
        permissionValues[perm] = true;
      });
      permissionsForm.setFieldsValue(permissionValues);
    } catch (error: any) {
      message.error('Failed to fetch role permissions: ' + (error?.response?.data?.message || error?.message));
    } finally {
      setPermissionsLoading(false);
      setPermissionsModalVisible(true);
    }
  };

  const handleDelete = async (roleId: string, roleName: string) => {
    // Không cho phép xóa các role mặc định
    if (['Admin', 'Manager', 'User'].includes(roleName)) {
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

  const handleSavePermissions = async (values: Record<string, boolean>) => {
    if (!editingRole) return;

    // Lấy giá trị từ form thay vì dùng values từ callback
    const formValues = permissionsForm.getFieldsValue();
    
    // Lọc ra các permissions được tích (checked = true)
    const selectedPermissions = Object.entries(formValues)
      .filter(([_, checked]) => checked === true)
      .map(([permission]) => permission);

    console.log('Selected permissions:', selectedPermissions);

    try {
      await permissionService.updateRolePermissions(editingRole.id, selectedPermissions);
      message.success('Permissions updated successfully');
      setPermissionsModalVisible(false);
      permissionsForm.resetFields();
      fetchRoles();
    } catch (error: any) {
      console.error('Failed to update permissions:', error);
      message.error('Failed to update permissions: ' + (error?.response?.data?.message || error?.message));
    }
  };

  const columns = [
    {
      title: 'Role Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => (
        <Tag color={name === 'Admin' ? 'red' : name === 'Manager' ? 'blue' : 'green'}>
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
      width: 250,
      fixed: 'right' as const,
      render: (_: unknown, record: Role) => (
        <Space>
          {/* Nút quản lý permissions cho tất cả roles */}
          <Button 
            icon={<KeyOutlined />} 
            onClick={() => handleManagePermissions(record)} 
            size="small"
          >
            Permissions
          </Button>
          {/* Cho phép chỉnh sửa tất cả roles */}
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" />
          {/* Không cho phép xóa role mặc định */}
          {!['Admin', 'Manager', 'User'].includes(record.name) && (
            <Popconfirm
              title="Delete Role"
              description="Are you sure you want to delete this role?"
              onConfirm={() => handleDelete(record.id, record.name)}
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
          scroll={{ x: 900 }}
        />
      </Card>

      {/* Add/Edit Role Modal */}
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
            <Input placeholder="Enter role name (e.g., Manager)" disabled={!!(editingId && editingRole?.name && ['Admin', 'Manager', 'User'].includes(editingRole.name))} />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea placeholder="Enter role description" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Manage Permissions Modal */}
      <Modal
        title={`Manage Permissions - ${editingRole?.name}`}
        open={permissionsModalVisible}
        onCancel={() => { setPermissionsModalVisible(false); permissionsForm.resetFields(); }}
        onOk={() => permissionsForm.submit()}
        width={700}
        confirmLoading={permissionsLoading}
      >
        <Form form={permissionsForm} layout="vertical" onFinish={handleSavePermissions}>
          {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
            <div key={categoryKey}>
              <Divider style={{ margin: '16px 0 12px 0', fontWeight: 'bold' }}>
                {category.label}
              </Divider>
              <Row gutter={[16, 8]}>
                {category.permissions.map((perm) => (
                  <Col span={6} key={perm.key}>
                    <Form.Item
                      name={perm.key}
                      valuePropName="checked"
                      noStyle
                    >
                      <Checkbox>{perm.label}</Checkbox>
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </Form>
      </Modal>
    </div>
  );
};

export default RolesPage;