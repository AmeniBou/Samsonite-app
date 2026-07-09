import { Link } from "react-router-dom";
import { Truck, RotateCcw, Mail } from "lucide-react";

const TopBar = () => {
  return (
    <div className="bg-[#d5eafd] text-black text-xs">
      <div className="samsonite-container flex items-center justify-between h-9">
        <Link to="/livraison" className="flex items-center gap-1.5 hover:underline">
          <Truck className="h-3.5 w-3.5" />
          <span>LIVRAISON OFFERTE A PARTIR DE 300 TND</span>
        </Link>
        <Link to="/retours" className="flex items-center gap-1.5 hover:underline">
          <RotateCcw className="h-3.5 w-3.5" />
          <span>RETOURS GRATUITS</span>
        </Link>
        <Link to="/newsletter" className="flex items-center gap-1.5 hover:underline">
          <Mail className="h-3.5 w-3.5" />
          <span>
            REJOIGNEZ NOTRE COMMUNAUTE <em className="not-italic font-semibold">+ CADEAU</em>
          </span>
        </Link>
      </div>
    </div>
  );
};

export default TopBar;
