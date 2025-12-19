"use client";
import Image from "next/image";
import React from "react";
import {
  Breadcrumb,
  Layout,
  Menu,
  theme,
  Typography,
  Card,
  Space,
  Button,
} from "antd";
const { Header, Content, Footer } = Layout;
const { Title, Paragraph } = Typography;
import { MainHeader, MainContent, MainFooter } from "@/components/layout/App";
import ScaleController from "@/components/ui/ScaleController";

export default function App() {
  return (
    <div>
      <Layout>
        <MainHeader />
        <MainContent />
        <MainFooter />
      </Layout>
    </div>
  );
}
