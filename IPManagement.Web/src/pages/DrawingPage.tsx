import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Typography, Breadcrumb, Table, Tag, message, Dropdown, Row, Col, Input, Empty, Modal, Form, Upload, Modal as AntModal } from 'antd';
import { ArrowLeftOutlined, EyeOutlined, DownloadOutlined, EditOutlined, DeleteOutlined, ToolOutlined, FolderOpenOutlined, UploadOutlined } from '@ant-design/icons';
import type { Drawing, DrawingUpdateRequest, DrawingUploadRequest } from '../types/drawing';
import { drawingService } from '../services/drawing.service';
import { unitService } from '../services/unit.service';
import { useAppSelector } from '../hooks/useAppSelector';
import { hasPermission, Permissions } from '../utils/permissions';

const { Title, Text } = Typography;
const { Search } = Input;

interface DrawingCardProps {
  drawing: Drawing;
  onPreview: (drawing: Drawing) => void;
  onEdit: (drawing: Drawing) => void;
  onDelete: (id: number) => void;
  canUpdate: boolean;
  canDelete: boolean;
}

const DrawingCard: React.FC<DrawingCardProps> = ({ drawing, onPreview, onEdit, onDelete, canUpdate, canDelete }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileTag = (fileType: string) => {
    const colors: Record<string, string> = {
      PDF: '#ff4d4f',
      DWG: '#1890ff',
      PNG: '#52c41a',
      JPG: '#fa8c16',
      VSDX: '#722ed1'
    };
    const bgColors: Record<string, string> = {
      PDF: 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
      DWG: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
      PNG: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
      JPG: 'linear-gradient(135deg, #fa8c16 0%, #ffc069 100%)',
      VSDX: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)'
    };
    
    const tagStyle: React.CSSProperties = {
      background: bgColors[fileType] || 'linear-gradient(135deg, #d9d9d9 0%, #f0f0f0 100%)',
      color: '#fff',
      border: 'none',
      fontWeight: 600,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };
    
    return <Tag style={tagStyle}>{fileType}</Tag>;
  };

  const menuItems = [
    ...(drawing.fileType !== 'DWG' && drawing.fileType !== 'VSDX' ? [{
      key: 'view',
      label: 'Xem',
      icon: <EyeOutlined />,
      onClick: () => onPreview(drawing)
    }] : []),
    {
      key: 'download',
      label: 'Tải xuống',
      icon: <DownloadOutlined />,
      onClick: () => drawingService.downloadDrawing(drawing.id, drawing.fileName)
    },
    ...(canUpdate ? [{
      key: 'edit',
      label: 'Sửa',
      icon: <EditOutlined />,
      onClick: () => onEdit(drawing)
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      label: 'Xóa',
      icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
      danger: true,
      onClick: () => {
        AntModal.confirm({
          title: 'Xóa bản vẽ',
          content: 'Bạn có chắc chắn muốn xóa bản vẽ này?',
          okText: 'Có',
          cancelText: 'Không',
          onOk: () => onDelete(drawing.id)
        });
      }
    }] : [])
  ];

  const getCardBorderColor = (fileType: string) => {
    const borderColors: Record<string, string> = {
      PDF: '#ff4d4f',
      DWG: '#1890ff',
      PNG: '#52c41a',
      JPG: '#fa8c16',
      VSDX: '#722ed1'
    };
    return borderColors[fileType] || '#d9d9d9';
  };

  const cardStyle: React.CSSProperties = {
    borderLeft: `4px solid ${getCardBorderColor(drawing.fileType)}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
  };

  return (
    <Card
      size="small"
      style={{ cursor: 'pointer', marginBottom: 12, ...cardStyle }}
      hoverable
      onClick={() => onPreview(drawing)}
    >
      <Row align="middle" gutter={[8, 8]}>
        <Col flex="auto">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <Text strong style={{ fontSize: 15 }}>{drawing.fileName}</Text>
              {getFileTag(drawing.fileType)}
            </div>
            <Space size="small">
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatFileSize(drawing.fileSize)}
              </Text>
              {drawing.version && (
                <>
                  <span style={{ color: '#d9d9d9' }}>|</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Phiên bản: {drawing.version}
                  </Text>
                </>
              )}
            </Space>
            {drawing.description && (
              <Text style={{ fontSize: 12, display: 'block', color: '#595959' }}>
                {drawing.description}
              </Text>
            )}
            <Text type="secondary" style={{ fontSize: 11 }}>
              📅 Tạo: {new Date(drawing.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </Space>
        </Col>
        <Col onClick={(e) => e.stopPropagation()}>
          <Dropdown
            menu={{ items: menuItems }}
            placement="bottomRight"
            trigger={['click']}
            getPopupContainer={(_trigger) => document.body}
          >
            <Button
              type="text"
              icon={<ToolOutlined />}
              size="small"
              style={{
                fontSize: '18px',
                color: getCardBorderColor(drawing.fileType),
                padding: '2px'
              }}
            />
          </Dropdown>
        </Col>
      </Row>
    </Card>
  );
};

const DrawingPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [filteredDrawings, setFilteredDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(false);
  const [unitName, setUnitName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingDrawing, setEditingDrawing] = useState<Drawing | null>(null);
  const [uploadForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const canCreate = useMemo(() => user ? hasPermission(user, Permissions.DRAWING_CREATE) : false, [user]);
  const canUpdate = useMemo(() => user ? hasPermission(user, Permissions.DRAWING_UPDATE) : false, [user]);
  const canDelete = useMemo(() => user ? hasPermission(user, Permissions.DRAWING_DELETE) : false, [user]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (id) {
      fetchDrawings();
      fetchUnitName();
    }
  }, [id]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      const filtered = drawings.filter((d) =>
        d.fileName.toLowerCase().includes(lowerTerm) ||
        d.version?.toLowerCase().includes(lowerTerm) ||
        d.description?.toLowerCase().includes(lowerTerm)
      );
      setFilteredDrawings(filtered);
    } else {
      setFilteredDrawings(drawings);
    }
  }, [searchTerm, drawings]);

  const fetchDrawings = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await drawingService.getDrawingsByUnit(parseInt(id));
      setDrawings(data);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể tải danh sách bản vẽ');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitName = async () => {
    if (!id) return;
    try {
      const data = await unitService.getUnitById(parseInt(id));
      setUnitName(data.name);
    } catch (error) {
      console.error('Failed to fetch unit name:', error);
    }
  };

  const handleUpload = async (values: DrawingUploadRequest) => {
    const fileValue = uploadForm.getFieldValue('file');
    
    console.log('[DrawingPage] Upload values:', values);
    console.log('[DrawingPage] File value from form:', fileValue);
    
    // Ant Design Upload có thể trả về object với thuộc tính 'file' hoặc 'fileList'
    let file = fileValue;
    if (fileValue && fileValue.file) {
      file = fileValue.file;
    } else if (fileValue && fileValue.fileList && fileValue.fileList.length > 0) {
      file = fileValue.fileList[0];
    }
    
    console.log('[DrawingPage] Extracted file:', file);
    
    if (!file) {
      message.error('Vui lòng chọn file');
      return;
    }

    const actualFile = file.originFileObj || file.raw || file;
    
    console.log('[DrawingPage] Actual file:', actualFile);

    if (!actualFile) {
      message.error('Không thể đọc file. Vui lòng thử lại.');
      return;
    }

    const formData = new FormData();
    formData.append('file', actualFile);
    if (values.version) formData.append('version', values.version || '');
    if (values.description) formData.append('description', values.description || '');

    console.log('[DrawingPage] Sending upload request with unitId:', id);

    try {
      await drawingService.uploadDrawingWithUnitId(parseInt(id!), formData);
      message.success('Upload bản vẽ thành công');
      setUploadModalVisible(false);
      uploadForm.resetFields();
      fetchDrawings();
    } catch (error: any) {
      console.error('[DrawingPage] Upload error:', error);
      message.error(error?.response?.data?.message || 'Upload bản vẽ thất bại');
    }
  };

  const handlePreview = async (drawing: Drawing) => {
    try {
      const blob = await drawingService.previewDrawing(drawing.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60000);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể xem trước bản vẽ');
    }
  };

  const handleDelete = async (drawingId: number) => {
    try {
      await drawingService.deleteDrawing(drawingId);
      message.success('Xóa bản vẽ thành công');
      fetchDrawings();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Xóa bản vẽ thất bại');
    }
  };

  const handleEdit = (drawing: Drawing) => {
    setEditingDrawing(drawing);
    editForm.setFieldsValue({
      version: drawing.version,
      description: drawing.description
    });
    setEditModalVisible(true);
  };

  const handleSubmitEdit = async (values: DrawingUpdateRequest) => {
    if (!editingDrawing) return;
    try {
      await drawingService.updateDrawing(editingDrawing.id, values);
      message.success('Cập nhật thông tin bản vẽ thành công');
      setEditModalVisible(false);
      setEditingDrawing(null);
      editForm.resetFields();
      fetchDrawings();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Cập nhật thông tin bản vẽ thất bại');
    }
  };

  const columns = [
    {
      title: 'Tên file',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
      width: 200,
      render: (fileName: string, record: Drawing) => (
        <a
          onClick={() => handlePreview(record)}
          style={{
            color: '#1890ff',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          {fileName}
        </a>
      )
    },
    {
      title: 'Loại',
      dataIndex: 'fileType',
      key: 'fileType',
      render: (fileType: string) => {
        const colors: Record<string, string> = {
          PDF: 'red',
          DWG: 'blue',
          PNG: 'green',
          JPG: 'orange',
          VSDX: 'purple'
        };
        return <Tag color={colors[fileType] || 'default'}>{fileType}</Tag>;
      },
      width: 80
    },
    {
      title: 'Kích thước',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (size: number) => {
        if (size < 1024) return size + ' B';
        if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
        return (size / (1024 * 1024)).toFixed(2) + ' MB';
      },
      width: 100
    },
    {
      title: 'Phiên bản',
      dataIndex: 'version',
      key: 'version',
      width: 100
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 200
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
      width: 120
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_: any, record: Drawing) => {
        const items: any[] = [];

        if (record.fileType !== 'DWG' && record.fileType !== 'VSDX') {
          items.push({
            key: 'view',
            label: 'Xem',
            icon: <EyeOutlined />,
            onClick: () => handlePreview(record)
          });
        }

        items.push({
          key: 'download',
          label: 'Tải xuống',
          icon: <DownloadOutlined />,
          onClick: () => drawingService.downloadDrawing(record.id, record.fileName)
        });

        if (canUpdate) {
          items.push({
            key: 'edit',
            label: 'Sửa',
            icon: <EditOutlined />,
            onClick: () => handleEdit(record)
          });
        }

        if (canDelete) {
          items.push({
            key: 'delete',
            label: 'Xóa',
            icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
            danger: true,
            onClick: () => {
              if (window.confirm('Bạn có chắc chắn muốn xóa bản vẽ này?')) {
                handleDelete(record.id);
              }
            }
          });
        }

        return (
          <Dropdown
            menu={{ items }}
            placement="bottomRight"
            trigger={['click']}
            getPopupContainer={(_trigger) => document.body}
          >
            <Button 
              type="text" 
              icon={<ToolOutlined />} 
              size="small"
              style={{ 
                fontSize: '18px', 
                color: '#666',
                padding: '2px'
              }}
            />
          </Dropdown>
        );
      }
    }
  ];

  if (!id) {
    return <div>Invalid unit ID</div>;
  }

  return (
    <div>
      <Breadcrumb
        items={[
          {
            title: (
              <a onClick={() => navigate('/units')}>
                <FolderOpenOutlined /> Đơn vị
              </a>
            )
          },
          {
            title: unitName || 'Loading...'
          },
          {
            title: 'Quản lý bản vẽ'
          }
        ]}
        style={{ marginBottom: 16 }}
      />

      <Card>
        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={24} md={12} lg={10}>
            <Button 
              type="default" 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate(`/units/${id}?name=${encodeURIComponent(unitName)}`)}
            >
              Quay lại
            </Button>
            <Title level={3} style={{ margin: 0, marginTop: 8 }}>Quản lý bản vẽ</Title>
          </Col>
          <Col xs={24} sm={24} md={12} lg={14}>
            <Space direction="horizontal" wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              {canCreate && (
                <Button 
                  type="primary" 
                  icon={<UploadOutlined />} 
                  onClick={() => setUploadModalVisible(true)}
                >
                  Upload bản vẽ
                </Button>
              )}
              <Search
                placeholder="Tìm kiếm bản vẽ..."
                allowClear
                onSearch={setSearchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', maxWidth: 300 }}
              />
            </Space>
          </Col>
        </Row>

        {isMobile ? (
          <div>
            {filteredDrawings.length === 0 ? (
              <Empty description="Không có bản vẽ nào" />
            ) : (
              filteredDrawings.map((drawing) => (
                <DrawingCard
                  key={drawing.id}
                  drawing={drawing}
                  onPreview={handlePreview}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                />
              ))
            )}
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredDrawings}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 1000 }}
            size="small"
          />
        )}
      </Card>

      {/* Upload Modal */}
      <Modal
        title="Upload bản vẽ mới"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          uploadForm.resetFields();
        }}
        onOk={() => uploadForm.submit()}
        okText="Upload"
        cancelText="Hủy"
      >
        <Form form={uploadForm} onFinish={handleUpload} layout="vertical">
          <Form.Item
            name="file"
            label="File bản vẽ"
            rules={[{ required: true, message: 'Vui lòng chọn file' }]}
          >
            <Upload
              accept=".pdf,.dwg,.png,.jpg,.jpeg,.vsdx"
              maxCount={1}
              beforeUpload={() => false}
              showUploadList={{ showPreviewIcon: false }}
            >
              <Button icon={<UploadOutlined />}>Chọn file</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="version" label="Phiên bản">
            <Input placeholder="VD: 1.0" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả bản vẽ..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Cập nhật thông tin bản vẽ"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingDrawing(null);
        }}
        onOk={() => {
          editForm.validateFields().then(values => {
            handleSubmitEdit(values);
          }).catch(info => {
            console.log('Validate Failed:', info);
          });
        }}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="version" label="Phiên bản">
            <Input placeholder="VD: 1.0" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả bản vẽ..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DrawingPage;