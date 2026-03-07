import { useState, useEffect } from 'react';
import { Tree, Spin, Empty } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { FolderOpenOutlined, FolderOutlined } from '@ant-design/icons';
import type { UnitTree } from '../types/unit';
import { unitService } from '../services/unit.service';

interface UnitTreeProps {
  onUnitSelect: (unitId: number | null, unitName: string | null) => void;
  selectedUnitId?: number | null;
}

interface TreeNode extends UnitTree {
  children?: TreeNode[];
}

const UnitTreeComponent: React.FC<UnitTreeProps> = ({ onUnitSelect, selectedUnitId }) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnitTree();
  }, []);

  const fetchUnitTree = async () => {
    try {
      setLoading(true);
      const data = await unitService.getUnitTree();
      setTreeData(data);
    } catch (error) {
      console.error('Failed to fetch unit tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTreeNodes = (nodes: TreeNode[]): DataNode[] => {
    return nodes.map((unit) => {
      const hasChildren = unit.childUnits && unit.childUnits.length > 0;
      const isSelected = selectedUnitId === unit.id;
      
      return {
        key: unit.id,
        title: (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {hasChildren ? <FolderOpenOutlined /> : <FolderOutlined />}
            <span>{unit.name}</span>
            {unit.ipAddressCount !== undefined && unit.ipAddressCount > 0 && (
              <span style={{ fontSize: 12, color: '#888' }}>({unit.ipAddressCount})</span>
            )}
          </span>
        ),
        selectable: true,
        selected: isSelected,
        children: unit.childUnits && unit.childUnits.length > 0
          ? renderTreeNodes(unit.childUnits)
          : undefined,
      };
    });
  };

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const unitId = selectedKeys[0] as number;
      const unitName = findUnitName(treeData, unitId);
      onUnitSelect(unitId, unitName);
    } else {
      onUnitSelect(null, null);
    }
  };

  const findUnitName = (nodes: TreeNode[], targetId: number): string | null => {
    for (const node of nodes) {
      if (node.id === targetId) {
        return node.name;
      }
      if (node.childUnits && node.childUnits.length > 0) {
        const found = findUnitName(node.childUnits, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const handleReset = () => {
    onUnitSelect(null, null);
  };

  return (
    <div style={{ 
      border: '1px solid #d9d9d9', 
      borderRadius: 4, 
      padding: 16,
      maxHeight: 'calc(100vh - 200px)',
      overflow: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Đơn vị</h3>
        <button 
          onClick={handleReset}
          style={{ 
            background: 'none', 
            border: '1px solid #d9d9d9', 
            borderRadius: 4, 
            padding: '4px 12px',
            cursor: 'pointer'
          }}
        >
          Tất cả
        </button>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spin />
        </div>
      ) : treeData.length === 0 ? (
        <Empty description="Không có đơn vị nào" />
      ) : (
        <Tree
          treeData={renderTreeNodes(treeData)}
          selectable
          multiple
          selectedKeys={selectedUnitId ? [selectedUnitId] : []}
          onSelect={handleSelect}
          blockNode
        />
      )}
    </div>
  );
};

export default UnitTreeComponent;