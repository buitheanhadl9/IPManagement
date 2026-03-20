import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Tag, Card, Row, Col, Typography, Dropdown } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EnvironmentOutlined, WifiOutlined, FolderOpenOutlined, ToolOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import type { Unit, UnitCreateRequest, UnitUpdateRequest, TransmissionChannelSelection } from '../types/unit';
import { unitService } from '../services/unit.service';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { hasPermission, Permissions } from '../utils/permissions';
import { signalRService } from '../services/signalr.service';
import type { UnitUpdateNotification } from '../types/notification';
import TruncatedDescription from '../components/TruncatedDescription';

const { Title } = Typography;
const { Search } = Input;

const UnitsPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortInfo, setSortInfo] = useState<{ field: string; order: 'ascend' | 'descend' | null }>({ field: '', order: null });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [transmissionChannels, setTransmissionChannels] = useState<TransmissionChannelSelection[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const navigate = useNavigate();
  const [editingPositionId, setEditingPositionId] = useState<number | null>(null);

  // Check permissions based on user permissions - use useMemo to re-calculate when user changes
  // Chỉ check permission khi đã load xong user
  const canCreateUnit = useMemo(() => user ? hasPermission(user, Permissions.UNIT_CREATE) : false, [user]);
  const canUpdateUnit = useMemo(() => user ? hasPermission(user, Permissions.UNIT_UPDATE) : false, [user]);
  const canDeleteUnit = useMemo(() => user ? hasPermission(user, Permissions.UNIT_DELETE) : false, [user]);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchUnits();
    fetchTransmissionChannels();

    // Listen for unit update notifications
    const unsubscribeUnit = signalRService.onUnitUpdated((notification: UnitUpdateNotification) => {
      // Refresh units list when any unit changes
      if (notification.action === 'Deleted') {
        message.success(`Đơn vị "${notification.unitName}" đã được xóa.`);
      } else if (notification.action === 'Created') {
        message.success(`Đơn vị "${notification.unitName}" đã được tạo.`);
      } else {
        message.success(`Đơn vị "${notification.unitName}" đã được cập nhật.`);
      }
      
      fetchUnits();
    });

    // Listen for permissions update notifications - to refresh units list when permissions change
    const unsubscribePermissions = signalRService.onPermissionsUpdated(() => {
      // Re-fetch units list when permissions change (user may have lost access to some units)
      fetchUnits();
    });

    return () => {
      unsubscribeUnit();
      unsubscribePermissions();
    };
  }, []);

  // Helper function to find all child unit IDs recursively
  const getAllChildUnitIds = (parentId: number, allUnits: Unit[]): number[] => {
    const children = allUnits.filter((u) => u.parentUnitId === parentId);
    let childIds: number[] = children.map((c) => c.id);
    
    for (const child of children) {
      childIds = [...childIds, ...getAllChildUnitIds(child.id, allUnits)];
    }
    
    return childIds;
  };

  useEffect(() => {
    let result = [...units];
    
    // Filter by search term
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      const matchedUnits = units.filter((u) =>
        u.name.toLowerCase().includes(lowerTerm) ||
        u.code?.toLowerCase().includes(lowerTerm)
      );
      
      // Include matched units and all their child units
      const matchedIds = new Set<number>();
      for (const unit of matchedUnits) {
        matchedIds.add(unit.id);
        const childIds = getAllChildUnitIds(unit.id, units);
        childIds.forEach((id) => matchedIds.add(id));
      }
      
      result = units.filter((u) => matchedIds.has(u.id));
    }
    
    // Sort if sortInfo is set
    if (sortInfo.field && sortInfo.order) {
      result.sort((a, b) => {
        let aValue: string | number = '';
        let bValue: string | number = '';
        
        switch (sortInfo.field) {
          case 'index':
            // Sort by displayOrder when sorting by index
            aValue = a.displayOrder ?? 999999;
            bValue = b.displayOrder ?? 999999;
            break;
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'code':
            aValue = a.code?.toLowerCase() || '';
            bValue = b.code?.toLowerCase() || '';
            break;
          case 'ipAddressCount':
            aValue = a.ipAddressCount || 0;
            bValue = b.ipAddressCount || 0;
            break;
          case 'isActive':
            aValue = a.isActive ? 1 : 0;
            bValue = b.isActive ? 1 : 0;
            break;
          default:
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
        }
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;
        
        return sortInfo.order === 'ascend' ? comparison : -comparison;
      });
    }
    
    setFilteredUnits(result);
  }, [searchTerm, units, sortInfo]);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const data = await unitService.getAllUnits();
      // Sort units by displayOrder
      const sortedData = [...data].sort((a, b) => {
        const aOrder = a.displayOrder ?? 999999;
        const bOrder = b.displayOrder ?? 999999;
        return aOrder - bOrder;
      });
      setUnits(sortedData);
    } catch {
      message.error('Failed to fetch units');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePositionChange = useCallback(async (unitId: number, newPosition: number) => {
    const currentIndex = units.findIndex((u) => u.id === unitId);
    if (currentIndex === -1) return;
    
    // Create new order array
    const newUnits = [...units];
    const unitToRemove = newUnits.splice(currentIndex, 1)[0];
    newUnits.splice(newPosition, 0, unitToRemove);
    
    // Calculate new display orders
    const unitOrderMap: Record<number, number> = {};
    newUnits.forEach((u: Unit, index: number) => {
      unitOrderMap[u.id] = index;
    });
    
    // Save to backend first
    try {
      await unitService.updateUnitDisplayOrder(unitOrderMap);
      message.success('Đã cập nhật thứ tự đơn vị');
      
      // Fetch units again to get the latest data from API
      await fetchUnits();
    } catch (error) {
      console.error('Failed to update display order:', error);
      message.error('Không thể cập nhật thứ tự đơn vị');
    }
    
    setEditingPositionId(null);
  }, [units]);

  const fetchTransmissionChannels = async () => {
    setChannelsLoading(true);
    try {
      const data = await unitService.getAllTransmissionChannels();
      setTransmissionChannels(data);
    } catch {
      message.error('Failed to fetch transmission channels');
    } finally {
      setChannelsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!canCreateUnit) {
      message.error('Bạn không có quyền thêm đơn vị.');
      return;
    }
    setEditingId(null);
    form.resetFields();
    await fetchTransmissionChannels();
    setModalVisible(true);
  };

  const handleEdit = async (record: Unit) => {
    if (!canUpdateUnit) {
      message.error('Bạn không có quyền chỉnh sửa đơn vị.');
      return;
    }
    setEditingId(record.id);
    await fetchTransmissionChannels();
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      address: record.address,
      parentUnitId: record.parentUnitId,
      description: record.description,
      note: record.note,
      isActive: record.isActive,
      transmissionChannelIds: record.transmissionChannelIds || [],
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    if (!canDeleteUnit) {
      message.error('Bạn không có quyền xóa đơn vị.');
      return;
    }
    try {
      await unitService.deleteUnit(id);
      message.success('Unit deleted successfully');
      fetchUnits();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete unit';
      message.error('Failed to delete unit: ' + errorMessage);
    }
  };

  const handleSubmit = async (values: UnitCreateRequest | UnitUpdateRequest) => {
    if (editingId && !canUpdateUnit) {
      message.error('Bạn không có quyền chỉnh sửa đơn vị.');
      return;
    }
    if (!editingId && !canCreateUnit) {
      message.error('Bạn không có quyền thêm đơn vị.');
      return;
    }
    
    // Ensure transmissionChannelIds is always an array of numbers (even if empty)
    // Ant Design Select with mode="multiple" may return values as strings or numbers
    let channelIds: number[] = [];
    if (values.transmissionChannelIds && Array.isArray(values.transmissionChannelIds)) {
      channelIds = values.transmissionChannelIds.map(id => Number(id)).filter(id => !isNaN(id));
    }
    
    const submitValues = {
      ...values,
      transmissionChannelIds: channelIds
    };
    
    try {
      if (editingId) {
        await unitService.updateUnit(editingId, submitValues as UnitUpdateRequest);
        message.success('Unit updated successfully');
      } else {
        await unitService.createUnit(submitValues as UnitCreateRequest);
        message.success('Unit created successfully');
      }
      setModalVisible(false);
      fetchUnits();
    } catch (error) {
      console.error('[UnitsPage] Failed to save unit:', error);
      message.error('Failed to save unit');
    }
  };

  const handleViewIPs = (unitId: number, unitName: string) => {
    navigate(`/units/${unitId}?name=${encodeURIComponent(unitName)}`);
  };

  const handleViewDrawings = (unitId: number, unitName: string) => {
    navigate(`/units/${unitId}/drawings?name=${encodeURIComponent(unitName)}`);
  };

  const getTransmissionChannelNames = (channelIds: number[] | undefined) => {
    if (!channelIds || channelIds.length === 0) return '-';
    const channels = transmissionChannels.filter(c => channelIds.includes(c.id));
    if (channels.length === 0) return '-';
    return channels.map(c => `${c.code} (${c.provider})`).join(', ');
  };

  // Regular Row Component
  const TableRow: React.FC<any> = (props) => {
    const { children, 'data-row-key': rowKey, ...restProps } = props;
    return <tr {...restProps}>{children}</tr>;
  };

  // State for showing full address/description in table view
  const [expandedAddressId, setExpandedAddressId] = useState<number | null>(null);
  const [expandedDescriptionId, setExpandedDescriptionId] = useState<number | null>(null);

  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: Unit, index: number) => {
        const isEditing = editingPositionId === record.id;
        
        if (isEditing) {
          return (
            <Select
              size="small"
              value={index + 1}
              onChange={(value) => handlePositionChange(record.id, value - 1)}
              onBlur={() => setEditingPositionId(null)}
              style={{ width: 100 }}
              autoFocus
            >
              {filteredUnits.map((u, i) => (
                <Select.Option key={u.id} value={i + 1}>
                  {i + 1}
                </Select.Option>
              ))}
            </Select>
          );
        }
        
        return (
          <a 
            onClick={() => setEditingPositionId(record.id)}
            style={{ fontWeight: 500, color: '#1890ff' }}
          >
            {index + 1}
          </a>
        );
      },
      sorter: true,
      sortOrder: sortInfo.field === 'index' ? sortInfo.order : null,
    },
    {
      title: 'Tên đơn vị',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      sortOrder: sortInfo.field === 'name' ? sortInfo.order : null,
      render: (name: string, record: Unit) => (
        <a onClick={() => handleViewIPs(record.id, name)} style={{ fontWeight: 500 }}>
          {name}
          {record.parentUnitName && (
            <>
              , <span style={{ color: '#999', fontWeight: 400 }}>{record.parentUnitName}</span>
            </>
          )}
        </a>
      ),
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      render: (_address: string | undefined, record: Unit) => {
        if (!_address) return '-';
        const isExpanded = expandedAddressId === record.id;
        return (
          <Space>
            {isExpanded ? (
              <>
                <span>{_address}</span>
                <Button
                  size="small"
                  onClick={() => setExpandedAddressId(null)}
                  icon={<UpOutlined />}
                  iconPosition="end"
                  style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    padding: '2px 8px'
                  }}
                >
                  Thu gọn
                </Button>
              </>
            ) : (
              <>
                {_address.length > 30 ? (
                  <Button
                    size="small"
                    onClick={() => setExpandedAddressId(record.id)}
                    icon={<DownOutlined />}
                    iconPosition="end"
                    style={{
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      color: '#1890ff'
                    }}
                  >
                    Xem thêm
                  </Button>
                ) : (
                  <span>{_address}</span>
                )}
              </>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Kênh truyền',
      key: 'transmissionChannels',
      render: (_: unknown, record: Unit) => (
        <span style={{ fontSize: 12 }}>{getTransmissionChannelNames(record.transmissionChannelIds)}</span>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (description: string | undefined, record: Unit) => {
        if (!description) return '-';
        const isExpanded = expandedDescriptionId === record.id;
        return (
          <Space>
            {isExpanded ? (
              <>
                <span style={{ color: '#666' }}>{description}</span>
                <Button
                  size="small"
                  onClick={() => setExpandedDescriptionId(null)}
                  icon={<UpOutlined />}
                  iconPosition="end"
                  style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    padding: '2px 8px'
                  }}
                >
                  Thu gọn
                </Button>
              </>
            ) : (
              <>
                {description.length > 30 ? (
                  <Button
                    size="small"
                    onClick={() => setExpandedDescriptionId(record.id)}
                    icon={<DownOutlined />}
                    iconPosition="end"
                    style={{
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      color: '#1890ff'
                    }}
                  >
                    Xem thêm
                  </Button>
                ) : (
                  <span style={{ color: '#666' }}>{description}</span>
                )}
              </>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Số IP',
      dataIndex: 'ipAddressCount',
      key: 'ipAddressCount',
      align: 'center' as const,
      sorter: true,
      sortOrder: sortInfo.field === 'ipAddressCount' ? sortInfo.order : null,
      render: (count: number) => <Tag color="blue">{count || 0}</Tag>,
    },
    {
      title: 'Quản lý bản vẽ',
      key: 'drawings',
      align: 'center' as const,
      render: (_: unknown, record: Unit) => (
        <Button
          icon={<FolderOpenOutlined />}
          onClick={() => handleViewDrawings(record.id, record.name)}
          size="small"
          type="link"
        >
          Bản vẽ
        </Button>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      align: 'center' as const,
      render: (_: unknown, record: Unit) => {
        const items = [
          {
            key: 'edit',
            label: 'Sửa',
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
            disabled: !canUpdateUnit,
          },
          {
            key: 'delete',
            label: 'Xóa',
            icon: <DeleteOutlined />,
            onClick: () => {
              if (canDeleteUnit) {
                if (window.confirm('Bạn có chắc chắn muốn xóa đơn vị này?')) {
                  handleDelete(record.id);
                }
              }
            },
            disabled: !canDeleteUnit,
          },
        ];

        return (
          <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']} getPopupContainer={(_trigger) => document.body}>
            <Button icon={<ToolOutlined />} size="small" type="text" />
          </Dropdown>
        );
      },
    },
  ];

  // UnitCard Component for Mobile View
  const UnitCard = ({ unit }: { unit: Unit }) => {
    const [showAddress, setShowAddress] = useState(false);
    const [showDescription, setShowDescription] = useState(false);

    return (
      <Card size="small" style={{ marginBottom: 12 }} className="unit-mobile-card">
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Space>
                <EnvironmentOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                <span style={{ fontSize: 16, fontWeight: 600 }}>{unit.name}</span>
              </Space>
              <Tag color={unit.isActive ? 'green' : 'default'}>{unit.isActive ? 'Hoạt động' : 'Không hoạt động'}</Tag>
            </div>
          </Col>

          <Col span={24}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Space>
                <strong>Mã:</strong> <span>{unit.code || '-'}</span>
              </Space>
              <Space>
                <strong>Đơn vị cấp trên:</strong> <span>{unit.parentUnitName || 'Root'}</span>
              </Space>
              <Space>
                <strong>Địa chỉ:</strong>
                {unit.address ? (
                  <>
                    {showAddress ? (
                      <>
                        <span>{unit.address}</span>
                        <Button
                          size="small"
                          onClick={() => setShowAddress(false)}
                          icon={<UpOutlined />}
                          iconPosition="end"
                          style={{
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            padding: '2px 8px'
                          }}
                        >
                          Thu gọn
                        </Button>
                      </>
                    ) : (
                      <>
                        {unit.address.length > 30 ? (
                          <Button
                            size="small"
                            onClick={() => setShowAddress(true)}
                            icon={<DownOutlined />}
                            iconPosition="end"
                            style={{
                              border: '1px solid #d9d9d9',
                              borderRadius: '4px',
                              padding: '2px 8px'
                            }}
                          >
                            Xem thêm
                          </Button>
                        ) : (
                          <span>{unit.address}</span>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <span>-</span>
                )}
              </Space>
              <Space>
                <strong>Kênh truyền:</strong> <span style={{ fontSize: 12 }}>{getTransmissionChannelNames(unit.transmissionChannelIds)}</span>
              </Space>
              <Space>
                <strong>Số IP:</strong> <Tag color="blue">{unit.ipAddressCount || 0}</Tag>
              </Space>
              <Space>
                <strong>Mô tả:</strong>
                {unit.description ? (
                  <>
                    {showDescription ? (
                      <>
                        <span style={{ color: '#666' }}>{unit.description}</span>
                        <Button
                          size="small"
                          onClick={() => setShowDescription(false)}
                          icon={<UpOutlined />}
                          iconPosition="end"
                          style={{
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            padding: '2px 8px'
                          }}
                        >
                          Thu gọn
                        </Button>
                      </>
                    ) : (
                      <>
                        {unit.description.length > 30 ? (
                          <Button
                            size="small"
                            onClick={() => setShowDescription(true)}
                            icon={<DownOutlined />}
                            iconPosition="end"
                            style={{
                              border: '1px solid #d9d9d9',
                              borderRadius: '4px',
                              padding: '2px 8px'
                            }}
                          >
                            Xem thêm
                          </Button>
                        ) : (
                          <span style={{ color: '#666' }}>{unit.description}</span>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <span>-</span>
                )}
              </Space>
            </Space>
          </Col>

          <Col span={24}>
            <Space wrap>
              <Button icon={<WifiOutlined />} onClick={() => handleViewIPs(unit.id, unit.name)} size="small">
                View IPs
              </Button>
              <Button icon={<FolderOpenOutlined />} onClick={() => handleViewDrawings(unit.id, unit.name)} size="small">
                Bản vẽ
              </Button>
              {(() => {
                const items = [
                  {
                    key: 'edit',
                    label: 'Sửa',
                    icon: <EditOutlined />,
                    onClick: () => handleEdit(unit),
                    disabled: !canUpdateUnit,
                  },
                  {
                    key: 'delete',
                    label: 'Xóa',
                    icon: <DeleteOutlined />,
                    onClick: () => {
                      if (canDeleteUnit) {
                        if (window.confirm('Bạn có chắc chắn muốn xóa đơn vị này?')) {
                          handleDelete(unit.id);
                        }
                      }
                    },
                    disabled: !canDeleteUnit,
                  },
                ];

                return (
                  <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']} getPopupContainer={(_trigger) => document.body}>
                    <Button icon={<ToolOutlined />} size="small" type="text">
                      Hành động
                    </Button>
                  </Dropdown>
                );
              })()}
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div>
      <Card className="responsive-card">
        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={24} md={12} lg={10}>
            <Title level={3} style={{ margin: 0, marginBottom: 0 }}>Quản lý đơn vị</Title>
          </Col>
          <Col xs={24} sm={24} md={12} lg={14}>
            <Space direction="horizontal" wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Search
                placeholder="Nhấn Enter hoặc nhấn biểu tượng để tìm kiếm"
                allowClear
                onSearch={setSearchTerm}
                style={{ width: '100%', maxWidth: 300 }}
                prefix={<SearchOutlined />}
              />
              {canCreateUnit && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  Thêm đơn vị
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {isMobile ? (
          <div style={{ marginTop: 16 }}>
            {filteredUnits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                Không có đơn vị nào
              </div>
            ) : (
              <>
                {filteredUnits.map((unitItem) => (
                  <UnitCard key={unitItem.id} unit={unitItem} />
                ))}
              </>
            )}
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredUnits}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 50, showSizeChanger: true, showQuickJumper: true }}
            scroll={{ x: 1000 }}
            size="small"
            components={{
              body: {
                row: TableRow,
              },
            }}
            onChange={(_pagination, _filters, sorter) => {
              const sorterObj = sorter as any;
              const columnKey = sorterObj.columnKey || sorterObj.field;
              const order = sorterObj.order;
              
              if (columnKey && order) {
                setSortInfo({ field: columnKey, order: order });
              } else {
                setSortInfo({ field: '', order: null });
              }
            }}
          />
        )}
      </Card>

      <Modal
        title={editingId ? 'Sửa đơn vị' : 'Thêm đơn vị'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
        bodyStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
        style={{ maxWidth: '95vw' }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Tên đơn vị"
            rules={[{ required: true, message: 'Vui lòng nhập tên đơn vị' }]}
          >
            <Input placeholder="e.g., Xã ABC" />
          </Form.Item>

          <Form.Item
            name="code"
            label="Mã đơn vị"
          >
            <Input placeholder="e.g., X-ABC-001" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Địa chỉ"
          >
            <Input placeholder="e.g., 123 Đường XYZ, Phường..." />
          </Form.Item>

          <Form.Item
            name="parentUnitId"
            label="Đơn vị cấp trên"
          >
            <Select placeholder="Chọn đơn vị cấp trên" allowClear showSearch optionFilterProp="children">
              {units.filter((u) => u.id !== editingId).map((unit) => (
                <Select.Option key={unit.id} value={unit.id}>
                  {unit.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="transmissionChannelIds"
            label="Kênh truyền"
          >
            <Select
              mode="multiple"
              placeholder="Chọn kênh truyền (tùy chọn)"
              allowClear
              loading={channelsLoading}
              style={{ width: '100%' }}
            >
              {transmissionChannels.map((channel) => (
                <Select.Option key={channel.id} value={channel.id}>
                  {channel.code} - {channel.provider}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
          >
            <Input.TextArea rows={3} placeholder="Nhập mô tả đơn vị" />
          </Form.Item>

          <Form.Item
            name="note"
            label="Ghi chú"
          >
            <Input.TextArea rows={3} placeholder="Nhập ghi chú" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Trạng thái"
            valuePropName="checked"
          >
            <Select placeholder="Chọn trạng thái">
              <Select.Option value={true}>Hoạt động</Select.Option>
              <Select.Option value={false}>Không hoạt động</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UnitsPage;