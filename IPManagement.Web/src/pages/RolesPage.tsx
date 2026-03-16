import { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Tag, Card, Row, Col, Typography, Breadcrumb, Popconfirm, Checkbox, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, KeyOutlined, FileTextOutlined } from '@ant-design/icons';
import { roleService } from '../services/role.service';
import { permissionService } from '../services/permission.service';
import type { Role, CreateRoleRequest } from '../types/role';
import { useAppSelector } from '../hooks/useAppSelector';
import { hasPermission, Permissions } from '../utils/permissions';

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
  DRAWING: {
    label: 'Drawing',
    permissions: [
      { key: Permissions.DRAWING_CREATE, label: 'Create' },
      { key: Permissions.DRAWING_READ, label: 'Read' },
      { key: Permissions.DRAWING_UPDATE, label: 'Update' },
      { key: Permissions.DRAWING_DELETE, label: 'Delete' },
    ]
  },
};

const RolesPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionsModalVisible, setPermissionsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();
  const [permissionsForm] = Form.useForm();
  // const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // Check permissions based on user permissions - use useMemo to re-calculate when user changes
  const canCreateRole = useMemo(() => user ? hasPermission(user, Permissions.ROLE_CREATE) : false, [user]);
  const canUpdateRole = useMemo(() => user ? hasPermission(user, Permissions.ROLE_UPDATE) : false, [user]);
  const canDeleteRole = useMemo(() => user ? hasPermission(user, Permissions.ROLE_DELETE) : false, [user]);
  const canManagePermissions = useMemo(() => user ? hasPermission(user, Permissions.ROLE_UPDATE) : false, [user]);
  const hasAccess = useMemo(() => user ? hasPermission(user, Permissions.ROLE_READ) : false, [user]);

  // useEffect phải được gọi trước khi return sớm
  useEffect(() => {
    if (user && hasAccess) {
      fetchRoles();
    }
  }, [user, hasAccess]);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Nếu không có quyền, hiển thị thông báo
  if (!hasAccess) {
    return (
      <div>
        <Title level={2}>Không có quyền truy cập</Title>
        <p>Bạn không có quyền truy cập trang quản lý role.</p>
      </div>
    );
  }

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
    if (!canCreateRole) {
      message.error('Bạn không có quyền tạo role.');
      return;
    }
    setEditingId(null);
    setEditingRole(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Role) => {
    if (!canUpdateRole) {
      message.error('Bạn không có quyền chỉnh sửa role.');
      return;
    }
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
    if (!canDeleteRole) {
      message.error('Bạn không có quyền xóa role.');
      return;
    }
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

  const handleSavePermissions = async (_values: Record<string, boolean>) => {
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
          {/* Nút quản lý permissions - chỉ hiện nếu có quyền */}
          {canManagePermissions && (
            <Button 
              icon={<KeyOutlined />} 
              onClick={() => handleManagePermissions(record)} 
              size="small"
            >
              Permissions
            </Button>
          )}
          {/* Cho phép chỉnh sửa tất cả roles - chỉ hiện nếu có quyền */}
          {canUpdateRole && (
            <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" />
          )}
          {/* Không cho phép xóa role mặc định - chỉ hiện nếu có quyền */}
          {canDeleteRole && !['Admin', 'Manager', 'User'].includes(record.name) && (
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

  // Role Card Component for Mobile View
  const RoleCard = ({ role }: { role: Role }) => (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      className="role-mobile-card"
    >
      <Row gutter={[16, 8]}>
        <Col span={24}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Space>
              <UserOutlined style={{ fontSize: 24, color: role.name === 'Admin' ? '#ff4d4f' : role.name === 'Manager' ? '#1890ff' : '#52c41a' }} />
              <Title level={5} style={{ margin: 0 }}>{role.name}</Title>
            </Space>
            <Tag color={role.name === 'Admin' ? 'red' : role.name === 'Manager' ? 'blue' : 'green'}>{role.name}</Tag>
          </div>
        </Col>
        
        <Col span={24}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {role.description && (
              <Space>
                <FileTextOutlined style={{ color: '#666', minWidth: 20 }} />
                <span>{role.description}</span>
              </Space>
            )}
            <Space>
              <UserOutlined style={{ color: '#666', minWidth: 20 }} />
              <span>User Count: {role.userCount}</span>
            </Space>
          </Space>
        </Col>
        
        <Col span={24}>
          <Divider style={{ margin: '8px 0' }} />
          <Space>
            {canManagePermissions && (
              <Button 
                icon={<KeyOutlined />} 
                onClick={() => handleManagePermissions(role)} 
                size="small"
              >
                Permissions
              </Button>
            )}
            {canUpdateRole && (
              <Button icon={<EditOutlined />} onClick={() => handleEdit(role)} size="small" type="primary">
                Edit
              </Button>
            )}
            {canDeleteRole && !['Admin', 'Manager', 'User'].includes(role.name) && (
              <Popconfirm
                title="Delete Role"
                description="Are you sure you want to delete this role?"
                onConfirm={() => handleDelete(role.id, role.name)}
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
              {canCreateRole && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  Add Role
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {/* Mobile View - Card Layout */}
        {isMobile ? (
          <div style={{ marginTop: 16 }}>
            {roles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                Không có role nào
              </div>
            ) : (
              <>
                {roles.map((roleItem) => (
                  <RoleCard key={roleItem.id} role={roleItem} />
                ))}
              </>
            )}
          </div>
        ) : (
          /* Desktop View - Table Layout */
          <Table
            columns={columns}
            dataSource={roles}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 900 }}
          />
        )}
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