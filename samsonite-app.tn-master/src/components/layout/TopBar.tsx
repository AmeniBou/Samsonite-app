import { Link } from "react-router-dom";
import { Truck, RotateCcw, Mail } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const TopBar = () => {
  const { t } = useLanguage();

  return (
    <div className="bg-[#d5eafd] text-black text-xs">
      <div className="samsonite-container flex items-center justify-between h-9">
        <Link to="/livraison" className="flex items-center gap-1.5 hover:underline">
          <Truck className="h-3.5 w-3.5" />
          <span>{t("top.freeShipping")}</span>
        </Link>
        <Link to="/retours" className="flex items-center gap-1.5 hover:underline">
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{t("top.freeReturns")}</span>
        </Link>
        <Link to="/newsletter" className="flex items-center gap-1.5 hover:underline">
          <Mail className="h-3.5 w-3.5" />
          <span>
            {t("top.community")} <em className="not-italic font-semibold">{t("top.gift")}</em>
          </span>
        </Link>
      </div>
    </div>
  );
};

export default TopBar;
