import { Button, Typography } from "antd";
import React, { useEffect } from "react";
import Link from "next/link";
import { Path } from "@/router/path";
import { AuthService } from "@/services/authService";
import { useRouter } from "next/navigation";
import t from "@/i18n/lang/zh/common";

interface HomeHeaderLoginProps {
  className?: string;
}

export default function HomeHeaderLogin({ className }: HomeHeaderLoginProps) {
  interface User {
    email: string;
    // Add other user properties if needed
  }

  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  useEffect(() => {
    AuthService.getCurrentUser()
      .then((user) => {
        setUser(user);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching current user:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className={className}>Loading...</div>;
  }

  return (
    <div className={className}>
      {user ? (
        <div>
          <Typography.Text className="mr-3 !text-white">
            {user.email}
          </Typography.Text>
          <Button
            className="ml-5"
            type="default"
            onClick={() => {
              AuthService.signOut().then(() => {
                setUser(null);
                router.push(Path.LOGIN);
              });
            }}
          >
            {t["退出登录"]}
          </Button>
        </div>
      ) : (
        <div>
          <Link href={Path.LOGIN}>
            <Button type="primary">{t["登录"]}</Button>
          </Link>
          <Link className="ml-5" href={Path.REGISTER}>
            <Button type="default">{t["注册"]}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
