import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Tag, Typography, Card, Popconfirm, Upload } from 'antd';
import { UploadOutlined, DownloadOutlined, EyeOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';

import type { Drawing, DrawingUploadRequest, DrawingUpdateRequest } from '../types/drawing';
import { drawingService } from '../services/drawing.service';

const { Title } = Typography;

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

    const formData = new FormData();
    formData.append('unitId', unitId.toString());
    formData.append('file', actualFile);
    if (values.version) formData.append('version', values.version);
    if (values.description) formData.append('description', values.description);

    try {
      await drawingService.uploadDrawing(formData);
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

  const columns = [
    {
      title: 'Tên file',
      dataIndex: 'fileName',
      key: 'fileName'
    },
    {
      title: 'Loại',
      dataIndex: 'fileType',
      key: 'fileType',
      render: (fileType: string) => getFileTag(fileType)
    },
    {
      title: 'Kích thước',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (size: number) => formatFileSize(size)
    },
    {
      title: 'Phiên bản',
      dataIndex: 'version',
      key: 'version'
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN')
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: Drawing) => (
        <Space>
          {record.fileType !== 'DWG' && record.fileType !== 'VSDX' && (
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => window.open(record.previewUrl, '_blank')}
            >
              Xem
            </Button>
          )}
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => drawingService.downloadDrawing(record.id, record.fileName)}
          >
            Tải
          </Button>
          {canUpdate && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingDrawing(record);
                editForm.setFieldsValue({
                  version: record.version,
                  description: record.description
                });
                setEditModalVisible(true);
              }}
            >
              Sửa
            </Button>
          )}
          {canDelete && (
            <Popconfirm
              title="Xóa bản vẽ"
              description="Bạn có chắc chắn muốn xóa bản vẽ này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Có"
              cancelText="Không"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Xóa
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
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

      <Table
        columns={columns}
        dataSource={drawings}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

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
        onOk={() => editForm.submit()}
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