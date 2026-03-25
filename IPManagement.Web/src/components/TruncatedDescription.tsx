import { useState } from 'react';
import { Typography, Button, Modal } from 'antd';
import { ExpandOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TruncatedDescriptionProps {
  description: string | undefined;
  maxLength?: number;
  title?: string;
}

const TruncatedDescription: React.FC<TruncatedDescriptionProps> = ({
  description,
  maxLength = 20,
  title = 'Mô tả',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!description || description.trim() === '') {
    return <Text type="secondary">-</Text>;
  }

  const isTruncated = description.length > maxLength;

  // Button style consistent across both modes
  const buttonStyle = {
    padding: '6px 16px',
    height: 'auto',
    flex: '0 0 auto',
    backgroundColor: '#69b1ff',
    borderColor: '#69b1ff',
    color: '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  };

  return (
    <>
      {isTruncated ? (
        <Button
          type="primary"
          size="middle"
          onClick={() => setIsModalOpen(true)}
          style={buttonStyle}
        >
          Xem thêm
        </Button>
      ) : (
        <Text>{description}</Text>
      )}
      <Modal
        title={title}
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