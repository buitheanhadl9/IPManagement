import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography, Checkbox } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../hooks/useAppSelector';
import { login, fetchProfile } from '../store/slices/authSlice';

const { Title } = Typography;

interface LoginFormValues {
  usernameOrEmail: string;
  password: string;
  remember: boolean;
}

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const error = useAppSelector((state) => state.auth.error);

  // Load saved credentials on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      form.setFieldsValue({ usernameOrEmail: savedUsername, remember: true });
    }
  }, [form]);

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await dispatch(login(values)).unwrap();
      await dispatch(fetchProfile()).unwrap();
      
      // Save username if remember me is checked
      if (values.remember) {
        localStorage.setItem('rememberedUsername', values.usernameOrEmail);
      } else {
        localStorage.removeItem('rememberedUsername');
      }
      
      message.success('Login successful!');
      navigate('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err || 'Login failed');
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 16,
    }}>
      <Card style={{ width: '100%', maxWidth: 420, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>IP Management</Title>
          <p style={{ color: '#666' }}>Sign in to your account</p>
        </div>
        
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="usernameOrEmail"
            rules={[
              { required: true, message: 'Please input your username or email!' },
              { validator: (_, value) => {
                  if (!value) return Promise.reject(new Error('Please input your username or email!'));
                  // Cho phép username (không có @) hoặc email (có @)
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Username or Email"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          {error && (
            <Form.Item>
              <div style={{ color: '#ff4d4f', fontSize: 14 }}>{error}</div>
            </Form.Item>
          )}

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>Ghi nhớ đăng nhập</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
        
        <div style={{ textAlign: 'center', marginTop: 16, color: '#666', fontSize: 12 }}>
          <p style={{ margin: 0 }}>🔒 Bảo mật: Mật khẩu của bạn được mã hóa và an toàn</p>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;