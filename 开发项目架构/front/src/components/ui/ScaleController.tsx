"use client";
import React, { useState, useEffect } from "react";
import { Select } from "antd";

type ScalePreset = "small" | "medium" | "large" | "xl";

const ScaleController: React.FC = () => {
  const [currentScale, setCurrentScale] = useState<ScalePreset>("medium");

  useEffect(() => {
    // 从localStorage获取保存的缩放设置
    const saved = localStorage.getItem("app-scale") as ScalePreset;
    if (saved) {
      setCurrentScale(saved);
      document.documentElement.setAttribute("data-scale", saved);
    }
  }, []);

  const handleScaleChange = (value: ScalePreset) => {
    setCurrentScale(value);
    localStorage.setItem("app-scale", value);
    document.documentElement.setAttribute("data-scale", value);
  };

  return (
    <Select
      value={currentScale}
      onChange={handleScaleChange}
      style={{ width: 120 }}
      options={[
        { value: "small", label: "小 (14px)" },
        { value: "medium", label: "中 (16px)" },
        { value: "large", label: "大 (18px)" },
        { value: "xl", label: "特大 (20px)" },
      ]}
    />
  );
};

export default ScaleController;