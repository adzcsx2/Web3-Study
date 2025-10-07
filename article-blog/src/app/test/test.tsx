import { useTranslation } from "@/i18n/hooks";
export default function TestPage() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t("你好世界")}</h1>
      <p>{t("这是一个测试页面")}</p>
    </div>
  );
}
