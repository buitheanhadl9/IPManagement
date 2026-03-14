import { useState } from 'react';
import { Layout, Menu, Button, Drawer, Avatar, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  TeamOutlined,
  BuildOutlined,
  LogoutOutlined,
  UserOutlined,
  CloudServerOutlined,
  MenuOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useAppSelector';
import { logout } from '../store/slices/authSlice';
import { hasPermission, Permissions } from '../utils/permissions';
import { SessionWarning } from '../components/SessionWarning';

const { Header, Sider, Content } = Layout;

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: 'Dashboard',
      style: { color: '#fff' },
    },
  ];

  // Show menu items based on permissions (chỉ khi user đã load)
  if (user) {
    // Quản lý đơn vị - cần UNIT_READ
    if (hasPermission(user, Permissions.UNIT_READ)) {
      menuItems.push({
        key: '/units',
        icon: <BuildOutlined />,
        label: 'Quản lý đơn vị',
      });
    }
    
    // Quản lý IP - cần IP_READ
    if (hasPermission(user, Permissions.IP_READ)) {
      menuItems.push({
        key: '/ip-management',
        icon: <CloudServerOutlined />,
        label: 'Quản lý IP',
      });
    }
    
    // Users - cần USER_READ
    if (hasPermission(user, Permissions.USER_READ)) {
      menuItems.push({
        key: '/users',
        icon: <TeamOutlined />,
        label: 'Users',
      });
    }
    
    // Roles - cần ROLE_READ
    if (hasPermission(user, Permissions.ROLE_READ)) {
      menuItems.push({
        key: '/roles',
        icon: <TeamOutlined />,
        label: 'Roles',
      });
    }
  }

  const currentKey = (() => {
    const foundItem = menuItems.find((item): item is NonNullable<typeof item> =>
      item !== null && item !== undefined && typeof item.key === 'string' && location.pathname.startsWith(item.key)
    );
    return foundItem?.key || '/';
  })();

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Hồ sơ',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
    },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      handleLogout();
    } else if (key === 'settings') {
      navigate('/settings');
    } else if (key === 'profile') {
      // TODO: Navigate to profile page
      navigate('/settings');
    }
  };

  const menuContent = (
    <>
      <div className="sidebar-logo">
        <div className="sidebar-logo-inner">
          <CloudServerOutlined />
        </div>
        <div className="sidebar-logo-text-wrapper">
          <span className="sidebar-logo-title">IP Management</span>
          <span className="sidebar-logo-subtitle">Hệ thống quản lý</span>
        </div>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[currentKey as string]}
        items={menuItems}
        className="sidebar-menu"
        onClick={({ key }) => {
          navigate(key as string);
          setMobileMenuOpen(false);
        }}
      />
    </>
  );

  return (
    <Layout className="main-layout">
      {/* Desktop Sider */}
      <Sider 
        breakpoint="lg" 
        collapsedWidth="80" 
        className="main-sider"
        trigger={null}
      >
        {menuContent}
      </Sider>

      <Layout className="main-layout-inner">
        {/* Header */}
        <Header className="main-header">
          <div className="header-left">
            <MenuOutlined className="mobile-menu-icon" onClick={() => setMobileMenuOpen(true)} />
            <span className="header-title">IP Management System</span>
          </div>
          <div className="header-right">
            <Dropdown 
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }} 
              placement="bottomRight"
              arrow
            >
              <Button className="user-dropdown-btn" type="text">
                <Avatar 
                  size="small" 
                  icon={<UserOutlined />} 
                />
                <span className="user-display-name">{user?.fullName || user?.username}</span>
              </Button>
            </Dropdown>
          </div>
        </Header>

        {/* Main Content */}
        <Content className="main-content">
          <SessionWarning />
          {children}
        </Content>
      </Layout>

      {/* Mobile Drawer */}
      <Drawer
        placement="left"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
        className="mobile-drawer"
        styles={{
          body: { padding: 0 },
        }}
      >
        {menuContent}
      </Drawer>
    </Layout>
  );
};

export default MainLayout;