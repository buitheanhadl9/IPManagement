import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Tag, Typography, Card, Popconfirm, Upload, Dropdown, Row, Col } from 'antd';
import { UploadOutlined, DownloadOutlined, EyeOutlined, DeleteOutlined, EditOutlined, ToolOutlined } from '@ant-design/icons';

import type { Drawing, DrawingUploadRequest, DrawingUpdateRequest } from '../types/drawing';
import { drawingService } from '../services/drawing.service';

const { Text } = Typography;

interface DrawingManagementProps {
  unitId: number;
  unitName: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const DrawingManagement: React.FC<DrawingManagementProps> = ({
  unitId,
  unitName,
  canCreate,
  canUpdate,
  canDelete
}) => {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingDrawing, setEditingDrawing] = useState<Drawing | null>(null);
  const [uploadForm] = Form.useForm();
  const [editForm] = Form.useForm();
  
  // Responsive: mobile khi màn hình < 768px
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch drawings
  const fetchDrawings = async () => {
    setLoading(true);
    try {
      const data = await drawingService.getDrawingsByUnit(unitId);
      setDrawings(data);
    } catch (error) {
      message.error('Không thể tải danh sách bản vẽ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrawings();
  }, [unitId]);

  // Handle upload
  const handleUpload = async (values: DrawingUploadRequest) => {
    const file = uploadForm.getFieldValue('file');
    
    if (!file || !Array.isArray(file) || file.length === 0) {
      message.error('Vui lòng chọn file');
      return;
    }

    // Ant Design Upload returns file object with originFileObj
    const actualFile = file[0].originFileObj || file[0].raw || file[0];

    if (!actualFile) {
      message.error('Không thể đọc file. Vui lòng thử lại.');
      return;
    }

    const formData = new FormData();
    formData.append('file', actualFile);
    if (values.version) formData.append('version', values.version || '');
    if (values.description) formData.append('description', values.description || '');

    try {
      await drawingService.uploadDrawingWithUnitId(unitId, formData);
      message.success('Upload bản vẽ thành công');
      setUploadModalVisible(false);
      uploadForm.resetFields();
      fetchDrawings();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Upload bản vẽ thất bại');
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    try {
      await drawingService.deleteDrawing(id);
      message.success('Xóa bản vẽ thành công');
      fetchDrawings();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Xóa bản vẽ thất bại');
    }
  };

  // Handle edit
  const handleEdit = async (values: DrawingUpdateRequest) => {
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

  // Handle preview
  const handlePreview = async (drawing: Drawing) => {
    try {
      const blob = await drawingService.previewDrawing(drawing.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Cleanup sau 1 phút
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60000);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể xem trước bản vẽ');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Get file icon/type
  const getFileTag = (fileType: string) => {
    const colors: Record<string, string> = {
      PDF: 'red',
      DWG: 'blue',
      PNG: 'green',
      JPG: 'orange',
      VSDX: 'purple'
    };
    return <Tag color={colors[fileType] || 'default'}>{fileType}</Tag>;
  };

  // Component hiển thị bản vẽ dưới dạng card (cho mobile)
  const DrawingCard: React.FC<{ drawing: Drawing }> = ({ drawing }) => {
    const menuItems = [
      ...(drawing.fileType !== 'DWG' && drawing.fileType !== 'VSDX' ? [{
        key: 'view',
        label: 'Xem',
        icon: <EyeOutlined />,
        onClick: () => handlePreview(drawing)
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
        onClick: () => {
          setEditingDrawing(drawing);
          editForm.setFieldsValue({
            version: drawing.version,
            description: drawing.description
          });
          setEditModalVisible(true);
        }
      }] : []),
      ...(canDelete ? [{
        key: 'delete',
        label: (
          <Popconfirm
            title="Xóa bản vẽ"
            description="Bạn có chắc chắn muốn xóa bản vẽ này?"
            onConfirm={() => handleDelete(drawing.id)}
            okText="Có"
            cancelText="Không"
          >
            <span style={{ color: '#ff4d4f' }}>Xóa</span>
          </Popconfirm>
        ),
        icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />
      }] : [])
    ];

    return (
      <Card size="small" style={{ marginBottom: 12 }}>
        <Row align="middle" gutter={[8, 8]}>
          <Col flex="auto">
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <Text strong style={{ fontSize: 14 }}>{drawing.fileName}</Text>
                <Space size="small" style={{ marginLeft: 8 }}>
                  {getFileTag(drawing.fileType)}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatFileSize(drawing.fileSize)}
                  </Text>
                </Space>
              </div>
              {drawing.version && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Phiên bản: {drawing.version}
                </Text>
              )}
              {drawing.description && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  {drawing.description}
                </Text>
              )}
              <Text type="secondary" style={{ fontSize: 11 }}>
                Tạo: {new Date(drawing.createdAt).toLocaleDateString('vi-VN')}
              </Text>
            </Space>
          </Col>
          <Col>
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
                  color: '#666',
                  padding: '2px'
                }}
              />
            </Dropdown>
          </Col>
        </Row>
      </Card>
    );
  };

  const columns = [
    {
      title: 'Tên file',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
      width: 150
    },
    {
      title: 'Loại',
      dataIndex: 'fileType',
      key: 'fileType',
      render: (fileType: string) => getFileTag(fileType),
      width: 70
    },
    {
      title: 'Kích thước',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (size: number) => formatFileSize(size),
      width: 80
    },
    {
      title: 'Phiên bản',
      dataIndex: 'version',
      key: 'version',
      width: 80
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 150
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
      width: 100
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
            onClick: () => {
              setEditingDrawing(record);
              editForm.setFieldsValue({
                version: record.version,
                description: record.description
              });
              setEditModalVisible(true);
            }
          });
        }

        if (canDelete) {
          items.push({
            key: 'delete',
            label: (
              <Popconfirm
                title="Xóa bản vẽ"
                description="Bạn có chắc chắn muốn xóa bản vẽ này?"
                onConfirm={() => handleDelete(record.id)}
                okText="Có"
                cancelText="Không"
              >
                <span style={{ color: '#ff4d4f' }}>
                  Xóa
                </span>
              </Popconfirm>
            ),
            icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />
          });
        }

        return (
          <Dropdown
            menu={{ items }}
            placement="bottomRight"
            trigger={['click']}
            getPopupContainer={(_trigger) => document.body}
            dropdownRender={(menu) => (
              <div style={{ zIndex: 1000 }}>
                {menu}
              </div>
            )}
          >
            <Button 
              type="text" 
              icon={<ToolOutlined />} 
              size="small"
              style={{ 
                fontSize: '18px', 
                color: '#666',
                padding: '2px',
                zIndex: 100
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#1890ff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
            />
          </Dropdown>
        );
      }
    }
  ];

  return (
    <Card title="Quản lý bản vẽ">
      <div style={{ marginBottom: 16 }}>
        {canCreate && (
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            Upload bản vẽ
          </Button>
        )}
      </div>

      {isMobile ? (
        <div>
          {drawings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              Không có bản vẽ nào
            </div>
          ) : (
            drawings.map((drawing) => (
              <DrawingCard key={drawing.id} drawing={drawing} />
            ))
          )}
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={drawings}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      )}

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
            valuePropName="fileList"
            getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList}
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
            <Input.TextArea rows={3} />
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
            handleEdit(values);
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
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default DrawingManagement;