"use client";
import React, { use, useEffect } from "react";
import { Button, Checkbox, Form, Input, message, Radio } from "antd";
import { User } from "@/types/user";
import { api } from "@/api/api";
import { useTranslation } from "@/i18n/hooks";
import UserEdit from "@/components/UserEdit";
export default function Personal_Center({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="items-center justify-center">
      <UserEdit params={params}></UserEdit>
    </main>
  );
}
