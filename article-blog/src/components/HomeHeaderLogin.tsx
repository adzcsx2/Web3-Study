import { Button } from "antd";
import React from "react";

interface HomeHeaderLoginProps {
  className?: string;
}

const HomeHeaderLogin: React.FC<HomeHeaderLoginProps> = ({ className }) => (
  <main className={className}>
    <Button type="primary">登录</Button>
    <Button className="!ml-5" type="default">
      注册
    </Button>
  </main>
);
export default HomeHeaderLogin;
