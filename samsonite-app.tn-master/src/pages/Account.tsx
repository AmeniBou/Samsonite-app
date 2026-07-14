import { useLanguage } from "@/lib/i18n";
import SimpleInfoPage from "./SimpleInfoPage";

const Account = () => {
  const { t } = useLanguage();

  return <SimpleInfoPage title={t("info.account.title")} description={t("info.account.text")} />;
};

export default Account;
