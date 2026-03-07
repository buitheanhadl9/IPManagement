import { useState } from 'react';
import { Card, Form, Input, Button, message, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { authService } from '../services/auth.service';

const { Title } = Typography;

const SettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Mật khẩu mới không khớp');
      return;
    }

    if (values.newPassword.length < 6) {
      message.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(values.currentPassword, values.newPassword);
      message.success('Đổi mật khẩu thành công');
      form.resetFields();
    } catch (error: any) {
      console.error('Failed to change password:', error);
      message.error(error?.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Cài đặt</Title>
      
      <Card title="Đổi mật khẩu" style={{ maxWidth: 500 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="currentPassword"
            label="Mật khẩu hiện tại"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu hiện tại' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu hiện tại"
              size="large"
            />
          </Form.Item>

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

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              Đổi mật khẩu
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SettingsPage;