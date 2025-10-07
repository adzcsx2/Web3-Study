import { Button } from "antd";
import React from "react";
import Link from "next/link";
import { Path } from "@/router/path";

interface HomeHeaderLoginProps {
  className?: string;
}

export default function HomeHeaderLogin({ className }: HomeHeaderLoginProps) {
  return (
    <div className={className}>
      <Link href={Path.LOGIN}>
        <Button type="primary">
          登录
        </Button>
      </Link>
      <span style={{ margin: "0 10px" }} />
      <Link href={Path.REGISTER}>
        <Button type="default">
          注册
        </Button>
      </Link>
    </div>
  );
}
