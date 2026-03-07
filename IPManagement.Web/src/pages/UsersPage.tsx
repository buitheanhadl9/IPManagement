import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm, Tag, Card, Row, Col, Typography, Breadcrumb, Checkbox, Switch } from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined, ReloadOutlined, PlusCircleOutlined, DeleteOutlined as DeleteCircleOutlined, LockOutlined } from '@ant-design/icons';
import type { User, UserCreateRequest, UserUpdateRequest, UserUnitAssignmentRequest } from '../types/user';
import { userService } from '../services/user.service';
import { unitService } from '../services/unit.service';
import { roleService } from '../services/role.service';
import type { Unit } from '../types/unit';
import type { Role } from '../types/role';
import { format } from 'date-fns';
import { useAppSelector } from '../hooks/useAppSelector';
import { isAdmin } from '../utils/permissions';
import { authService } from '../services/auth.service';

const { Title } = Typography;
const { Search } = Input;

interface UnitAssignmentForm {
  unitId: number;
  isPrimary: boolean;
}

const UsersPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<{ id: number; name: string }[]>([]);
  const [systemRoles, setSystemRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [_resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordForm] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const [unitFilter, setUnitFilter] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [unitAssignments, setUnitAssignments] = useState<UnitAssignmentForm[]>([]);
  const [assignAllUnits, setAssignAllUnits] = useState(false);

  // Check permissions - only Admin can create, update, delete users
  const canCreateUser = isAdmin(user);
  const canUpdateUser = isAdmin(user);
  const canDeleteUser = isAdmin(user);

  useEffect(() => {
    fetchUsers();
    fetchUnits();
    fetchSystemRoles();
  }, [currentPage, pageSize, unitFilter, roleFilter]);

  const fetchSystemRoles = async () => {
    try {
      const roleList = await roleService.getAllRoles();
      setSystemRoles(roleList);
    } catch (error) {
      console.error('Failed to fetch system roles:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userService.getAllUsers(currentPage, pageSize, unitFilter || undefined);
      let filteredUsers = response.items;
      
      if (searchTerm.trim()) {
        const lowerTerm = searchTerm.toLowerCase();
        filteredUsers = filteredUsers.filter(
          (u) =>
            u.username.toLowerCase().includes(lowerTerm) ||
            u.email.toLowerCase().includes(lowerTerm) ||
            u.fullName?.toLowerCase().includes(lowerTerm)
        );
      }
      
      if (roleFilter) {
        filteredUsers = filteredUsers.filter((u) => u.roles?.includes(roleFilter));
      }
      
      setUsers(filteredUsers);
      setTotal(filteredUsers.length);
    } catch (error: any) {
      message.error('Failed to fetch users: ' + (error?.response?.data?.message || error?.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await unitService.getAllUnitsForSelection();
      setUnits(response.map((u) => ({ id: u.id, name: u.name })));
    } catch (error) {
      console.error('Failed to fetch units:', error);
    }
  };

  const handleAdd = () => {
    if (!canCreateUser) {
      message.error('Bạn không có quyền thêm user. Chỉ Admin mới được thêm user.');
      return;
    }
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ roles: [], isActive: true });
    setUnitAssignments([]);
    setAssignAllUnits(false);
    // Refresh roles khi mở modal để đảm bảo có role mới
    fetchSystemRoles();
    setModalVisible(true);
  };

  const handleEdit = (record: User) => {
    if (!canUpdateUser) {
      message.error('Bạn không có quyền chỉnh sửa user. Chỉ Admin mới được chỉnh sửa user.');
      return;
    }
    setEditingId(record.id);
    form.setFieldsValue({
      email: record.email,
      fullName: record.fullName,
      phone: record.phone,
      isActive: record.isActive,
      roles: record.roles,
    });
    // Chuyển đổi units thành unitAssignments với null check
    const assignments: UnitAssignmentForm[] = record.units?.map(u => ({
      unitId: u.id,
      role: u.role,
      isPrimary: u.isPrimary
    })) || [];
    setUnitAssignments(assignments);
    setAssignAllUnits(record.units && record.units.length === units.length);
    // Refresh roles khi mở modal để đảm bảo có role mới
    fetchSystemRoles();
    setModalVisible(true);
  };

  const handleDelete = async (userId: string) => {
    if (!canDeleteUser) {
      message.error('Bạn không có quyền xóa user. Chỉ Admin mới được xóa user.');
      return;
    }
    try {
      await userService.deleteUser(userId);
      message.success('User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      message.error('Failed to delete user: ' + (error?.response?.data?.message || error?.message));
    }
  };

  const handleResetPassword = (userId: string) => {
    if (!isAdmin(user)) {
      message.error('Chỉ Admin mới được đổi mật khẩu cho user khác.');
      return;
    }
    setResetPasswordUserId(userId);
    resetPasswordForm.resetFields();
    setResetPasswordModalVisible(true);
  };

  const handleSubmitResetPassword = async (values: { newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Mật khẩu mới không khớp');
      return;
    }

    if (values.newPassword.length < 6) {
      message.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (!resetPasswordUserId) {
      message.error('Không tìm thấy user');
      return;
    }

    setResetPasswordLoading(true);
    void _resetPasswordLoading; // Mark as used
    try {
      await authService.adminResetPassword(resetPasswordUserId, values.newPassword);
      message.success('Đổi mật khẩu thành công');
      setResetPasswordModalVisible(false);
      resetPasswordForm.resetFields();
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      message.error(error?.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const addUnitAssignment = () => {
    if (!canCreateUser && !canUpdateUser) {
      message.error('Bạn không có quyền chỉnh sửa user.');
      return;
    }
    setAssignAllUnits(false); // Bỏ tích checkbox khi thêm unit thủ công
    setUnitAssignments([...unitAssignments, { unitId: 0, isPrimary: false }]);
  };

  const removeUnitAssignment = (index: number) => {
    if (!canCreateUser && !canUpdateUser) {
      message.error('Bạn không có quyền chỉnh sửa user.');
      return;
    }
    setAssignAllUnits(false); // Bỏ tích checkbox khi xóa unit
    const updated = unitAssignments.filter((_, i) => i !== index);
    setUnitAssignments(updated);
  };

  const updateUnitAssignment = (index: number, field: keyof UnitAssignmentForm, value: any) => {
    if (!canCreateUser && !canUpdateUser) {
      message.error('Bạn không có quyền chỉnh sửa user.');
      return;
    }
    setAssignAllUnits(false); // Bỏ tích checkbox khi sửa unit
    let updated = [...unitAssignments];
    updated[index] = { ...updated[index], [field]: value };
    
    // Nếu đặt isPrimary = true, đặt các cái khác thành false
    if (field === 'isPrimary' && value === true) {
      updated = updated.map((a, i) => i === index ? a : { ...a, isPrimary: false });
    }
    
    setUnitAssignments(updated);
  };

  const handleSubmit = async (values: UserCreateRequest | UserUpdateRequest) => {
    if (editingId && !canUpdateUser) {
      message.error('Bạn không có quyền chỉnh sửa user.');
      return;
    }
    if (!editingId && !canCreateUser) {
      message.error('Bạn không có quyền thêm user.');
      return;
    }
    try {
      // Nếu checkbox "Assign All Units" được tích và đang tạo mới, gán tất cả units
      let assignmentsToUse = unitAssignments;
      if (assignAllUnits && !editingId && units.length > 0) {
        assignmentsToUse = units.map(u => ({
          unitId: u.id,
          isPrimary: false
        }));
        // Đặt unit đầu tiên là primary
        if (assignmentsToUse.length > 0) {
          assignmentsToUse[0].isPrimary = true;
        }
      }
      
      // Chuẩn hóa unitAssignments (role mặc định là "User" - không dùng nữa)
      const formattedAssignments: UserUnitAssignmentRequest[] = assignmentsToUse
        .filter(a => a.unitId !== 0)
        .map(a => ({
          unitId: a.unitId,
          role: 'User', // Role mặc định, không dùng trong Unified Roles mới
          isPrimary: a.isPrimary
        }));

      const requestData = {
        ...values,
        unitAssignments: formattedAssignments
      };

      if (editingId) {
        await userService.updateUser(editingId, requestData as UserUpdateRequest);
        message.success('User updated successfully');
      } else {
        await userService.createUser(requestData as UserCreateRequest);
        message.success('User created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      setUnitAssignments([]);
      setAssignAllUnits(false);
      fetchUsers();
      fetchSystemRoles(); // Refresh roles sau khi save
    } catch (error: any) {
      console.error('Failed to save user:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      message.error('Failed to save user: ' + errorMessage);
    }
  };

  const getPrimaryUnitName = (record: User): string => {
    const primary = record.units?.find(u => u.isPrimary);
    return primary ? primary.name : '-';
  };

  const getAllUnitNames = (record: User): string => {
    return record.units?.map(u => u.name).join(', ') || '-';
  };

  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      width: 150,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: 'Full Name',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 150,
      render: (name: string | undefined) => name || '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (phone: string | undefined) => phone || '-',
    },
    {
      title: 'Primary Unit',
      dataIndex: 'units',
      key: 'primaryUnit',
      width: 150,
      render: (_: any, record: User) => getPrimaryUnitName(record),
    },
    {
      title: 'All Units',
      dataIndex: 'units',
      key: 'allUnits',
      width: 200,
      render: (_: any, record: User) => getAllUnitNames(record),
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      width: 150,
      render: (roles: string[]) => (
        <Space wrap>
          {roles.map((role) => (
            <Tag key={role} color={role === 'Admin' ? 'red' : role === 'Manager' ? 'blue' : 'green'}>
              {role}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      align: 'center' as const,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>{isActive ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      width: 160,
      render: (date: string | undefined) => date ? format(new Date(date), 'dd/MM/yyyy HH:mm') : 'Never',
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      width: 150,
      fixed: 'right' as const,
      render: (_: unknown, record: User) => (
        <Space>
          {isAdmin(user) && (
            <Button
              icon={<LockOutlined />}
              onClick={() => handleResetPassword(record.id)}
              size="small"
              title="Đổi mật khẩu"
            >
              Đổi MK
            </Button>
          )}
          {canUpdateUser && (
            <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" />
          )}
          {canDeleteUser && (
            <Popconfirm
              title="Delete User"
              description="Are you sure you want to delete this user?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button icon={<DeleteCircleOutlined />} danger size="small" />
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
          { title: 'User Management' },
        ]}
        style={{ marginBottom: 16 }}
      />

      <Card className="responsive-card">
        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={24} md={12} lg={10}>
            <Title level={3} style={{ margin: 0, marginBottom: 0 }}>User Management</Title>
          </Col>
          <Col xs={24} sm={24} md={12} lg={14}>
            <Space direction="horizontal" wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Search
                placeholder="Search by username, email..."
                allowClear
                onSearch={setSearchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', maxWidth: 250 }}
                prefix={<SearchOutlined />}
              />
              {canCreateUser && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  Add User
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="Filter by Unit"
              allowClear
              value={unitFilter}
              onChange={(value) => { setUnitFilter(value || null); setCurrentPage(1); }}
              style={{ width: '100%' }}
            >
              {units.map((unit) => (
                <Select.Option key={unit.id} value={unit.id}>{unit.name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="Filter by Role"
              allowClear
              value={roleFilter}
              onChange={(value) => { setRoleFilter(value || ''); setCurrentPage(1); }}
              style={{ width: '100%' }}
            >
              <Select.Option value="Admin">Admin</Select.Option>
              <Select.Option value="Manager">Manager</Select.Option>
              <Select.Option value="User">User</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Button icon={<ReloadOutlined />} onClick={fetchUsers}>
              Refresh
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size || 10);
            },
          }}
          scroll={{ x: 1400 }}
          size="small"
        />
      </Card>

      <Modal
        title={editingId ? 'Edit User' : 'Add User'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setUnitAssignments([]);
          setAssignAllUnits(false);
          // Refresh roles khi đóng modal
          fetchSystemRoles();
        }}
        onOk={() => form.submit()}
        width={700}
        bodyStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
        style={{ maxWidth: '95vw' }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!editingId && (
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: 'Please enter username' }]}
            >
              <Input placeholder="Enter username" />
            </Form.Item>
          )}

          {!editingId && (
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter password' }, { min: 6, message: 'Password must be at least 6 characters' }]}
            >
              <Input.Password placeholder="Enter password" />
            </Form.Item>
          )}

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: 'Please enter email' }, { type: 'email', message: 'Invalid email format' }]}
          >
            <Input placeholder="Enter email" />
          </Form.Item>

          <Form.Item
            name="fullName"
            label="Full Name"
          >
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone"
          >
            <Input placeholder="Enter phone number" />
          </Form.Item>

          <Form.Item label="Unit Assignments">
            <Space direction="vertical" style={{ width: '100%' }}>
              {unitAssignments.map((assignment, index) => (
                <Card key={index} size="small" style={{ padding: '8px 16px' }}>
                  <Row gutter={16} align="middle">
                    <Col span={17}>
                      <Select
                        placeholder="Select unit"
                        value={assignment.unitId || undefined}
                        onChange={(value) => updateUnitAssignment(index, 'unitId', value)}
                        style={{ width: '100%' }}
                        showSearch
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {units
                          .filter((unit) => {
                            // Hiển thị unit nếu:
                            // 1. Unit này đang được chọn ở dòng hiện tại, HOẶC
                            // 2. Unit này chưa được chọn ở bất kỳ dòng nào khác
                            return assignment.unitId === unit.id || !unitAssignments.some((a, i) => a.unitId === unit.id && i !== index);
                          })
                          .map((unit) => (
                            <Select.Option key={unit.id} value={unit.id}>{unit.name}</Select.Option>
                          ))}
                      </Select>
                    </Col>
                    <Col span={5}>
                      <Checkbox
                        checked={assignment.isPrimary}
                        onChange={(e) => updateUnitAssignment(index, 'isPrimary', e.target.checked)}
                      >
                        Primary
                      </Checkbox>
                    </Col>
                    <Col span={2}>
                      <Button
                        icon={<DeleteCircleOutlined />}
                        onClick={() => removeUnitAssignment(index)}
                        size="small"
                        danger
                      />
                    </Col>
                  </Row>
                </Card>
              ))}
              <Button
                type="dashed"
                onClick={addUnitAssignment}
                icon={<PlusCircleOutlined />}
                style={{ width: '100%' }}
              >
                Add Unit
              </Button>
              <Checkbox
                checked={assignAllUnits}
                onChange={(e) => {
                  setAssignAllUnits(e.target.checked);
                  if (e.target.checked) {
                    // Tự động gán tất cả units khi tích checkbox
                    const allAssignments = units.map((u, idx) => ({
                      unitId: u.id,
                      isPrimary: idx === 0 // Unit đầu tiên là primary
                    }));
                    setUnitAssignments(allAssignments);
                  } else {
                    // Xóa tất cả assignments khi bỏ tích
                    setUnitAssignments([]);
                  }
                }}
              >
                Assign All Units
              </Checkbox>
            </Space>
          </Form.Item>

          <Form.Item
            name="roles"
            label="System Roles"
            tooltip="Roles that apply across all units"
          >
            <Select mode="multiple" placeholder="Select system roles">
              {systemRoles.map((role) => (
                <Select.Option key={role.name} value={role.name}>{role.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          {editingId && (
            <Form.Item
              name="isActive"
              label="Status"
              valuePropName="checked"
            >
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Reset Password Modal for Admin */}
      <Modal
        title="Đổi mật khẩu cho user"
        open={resetPasswordModalVisible}
        onCancel={() => { setResetPasswordModalVisible(false); resetPasswordForm.resetFields(); }}
        onOk={() => resetPasswordForm.submit()}
        okText="Đổi mật khẩu"
        cancelText="Hủy"
      >
        <Form form={resetPasswordForm} layout="vertical" onFinish={handleSubmitResetPassword}>
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu mới"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập lại mật khẩu mới"
              size="large"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;