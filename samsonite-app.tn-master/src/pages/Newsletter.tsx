import { useLanguage } from "@/lib/i18n";
import SimpleInfoPage from "./SimpleInfoPage";

const Newsletter = () => {
  const { t } = useLanguage();

  return <SimpleInfoPage title={t("info.newsletter.title")} description={t("info.newsletter.text")} />;
};

export default Newsletter;
