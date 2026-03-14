import { useState } from 'react';
import { Typography, Button, Modal } from 'antd';
import { ExpandOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TruncatedDescriptionProps {
  description: string | undefined;
  maxLength?: number;
}

const TruncatedDescription: React.FC<TruncatedDescriptionProps> = ({
  description,
  maxLength = 50,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!description || description.trim() === '') {
    return <Text type="secondary">-</Text>;
  }

  const isTruncated = description.length > maxLength;
  const truncatedText = isTruncated ? description.slice(0, maxLength) + '...' : description;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Text style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {truncatedText}
        </Text>
        {isTruncated && (
          <Button
            type="link"
            size="small"
            icon={<ExpandOutlined />}
            onClick={() => setIsModalOpen(true)}
            style={{ padding: 0, height: 'auto' }}
          >
            Xem thêm
          </Button>
        )}
      </div>
      <Modal
        title="Mô tả"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={600}
      >
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {description}
        </div>
      </Modal>
    </>
  );
};

export default TruncatedDescription;