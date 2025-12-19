import React, { useCallback } from "react";
import { Layout, Menu, Typography, InputNumber, Input } from "antd";

const ExchangeCoinInput: React.FC = () => {
  const onChange = useCallback((value: string) => {
    console.log("Input changed:", value);
  }, []);

  return (
    <div className="m-auto border border-gray-200 rounded-2xl w-120 h-36 p-4">
      <Typography.Text
        className="text-lg! block! mb-1"
        style={{ color: "#666666" }}
      >
        出售
      </Typography.Text>
      <Input
        className="text-3xl! h-15! w-60! block! border-none! p-0! "
        min={0}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: "none",
          boxShadow: "none",
        }}
      />
    </div>
  );
};

export default ExchangeCoinInput;
