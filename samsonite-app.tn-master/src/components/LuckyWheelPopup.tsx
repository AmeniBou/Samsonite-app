import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Gift, X } from "lucide-react";

import { useCart } from "@/hooks/useCart";
import { useLanguage } from "@/lib/i18n";

const REWARD_CODE = "REFONTE10";
const REWARD_PERCENTAGE = 10;

type WheelResult = "win" | "lose" | null;

const wheelSegments: Array<{ result: Exclude<WheelResult, null>; label: string; shortLabel: string; centerAngle: number }> = [
  { result: "win", label: "-10%", shortLabel: "-10%", centerAngle: 22.5 },
  { result: "lose", label: "Pas de remise", shortLabel: "Pas gagné", centerAngle: 67.5 },
  { result: "win", label: "-10%", shortLabel: "-10%", centerAngle: 112.5 },
  { result: "lose", label: "Pas de remise", shortLabel: "Pas gagné", centerAngle: 157.5 },
  { result: "win", label: "-10%", shortLabel: "-10%", centerAngle: 202.5 },
  { result: "lose", label: "Pas de remise", shortLabel: "Pas gagné", centerAngle: 247.5 },
  { result: "win", label: "-10%", shortLabel: "-10%", centerAngle: 292.5 },
  { result: "lose", label: "Pas de remise", shortLabel: "Pas gagné", centerAngle: 337.5 },
];

const wheelKnobs = Array.from({ length: 8 }, (_, index) => index * 45);

const LuckyWheelPopup = () => {
  const { t } = useLanguage();
  const { applyWheelReward } = useCart();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelResult>(null);
  const [rotation, setRotation] = useState(0);
  const [hasShownThisVisit, setHasShownThisVisit] = useState(false);

  const isPublicPage = useMemo(
    () => !location.pathname.startsWith("/admin") && !location.pathname.startsWith("/commande/confirmation"),
    [location.pathname]
  );

  useEffect(() => {
    if (!isPublicPage || typeof window === "undefined") return;
    if (hasShownThisVisit) return;

    const timer = window.setTimeout(() => {
      setOpen(true);
      setHasShownThisVisit(true);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [hasShownThisVisit, isPublicPage]);

  const close = () => {
    setOpen(false);
  };

  const spin = () => {
    if (spinning || result) return;

    const won = Math.random() < 0.5;
    const nextResult: WheelResult = won ? "win" : "lose";
    setSpinning(true);
    setResult(null);

    const targetSegments = wheelSegments.filter((segment) => segment.result === nextResult);
    const targetSegment = targetSegments[Math.floor(Math.random() * targetSegments.length)];
    const targetOffset = 90 - targetSegment.centerAngle;
    setRotation((previous) => previous + 1440 + targetOffset);

    window.setTimeout(() => {
      setResult(nextResult);
      setSpinning(false);

      if (won) {
        applyWheelReward({
          code: REWARD_CODE,
          percentage: REWARD_PERCENTAGE,
          label: t("cart.wheelReward"),
          createdAt: new Date().toISOString(),
        });
      }
    }, 2600);
  };

  if (!open) return null;

  const won = result === "win";
  const lost = result === "lose";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="relative w-full max-w-[780px] overflow-hidden bg-white shadow-2xl">
        <button
          type="button"
          onClick={close}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100"
          aria-label={t("wheel.dismiss")}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
          <div className="relative flex min-h-[390px] items-center justify-center overflow-hidden bg-[#effaf8] px-8 py-10">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,169,157,0.15),transparent_46%,rgba(255,202,103,0.38))]" />
            <div className="absolute -left-12 top-8 h-28 w-28 rounded-full bg-[#c7f1ec]" />
            <div className="absolute -bottom-10 right-8 h-24 w-24 rounded-full bg-[#ffe6b8]" />
            <div className="absolute right-3 top-1/2 z-30 flex -translate-y-1/2 items-center">
              <div className="-mr-2 h-0 w-0 border-y-[18px] border-r-[34px] border-y-transparent border-r-white drop-shadow-[0_5px_7px_rgba(66,22,40,0.18)]" />
              <div className="h-16 w-16 rounded-full bg-white p-1.5 shadow-[0_8px_18px_rgba(66,22,40,0.22)]">
                <div className="flex h-full w-full items-center justify-center rounded-full border-[5px] border-black bg-white">
                  <img src="/assets/samsonite-logo.png" alt="Samsonite" className="h-5 w-10 object-contain" />
                </div>
              </div>
            </div>
            <div className="absolute h-[354px] w-[354px] rounded-full bg-white shadow-[0_18px_34px_rgba(119,21,64,0.16)]" />
            <div
              className="relative h-72 w-72 rounded-full border-[12px] border-white shadow-[0_16px_28px_rgba(0,105,112,0.16)] transition-transform ease-out sm:h-80 sm:w-80"
              style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: "2600ms",
                background:
                  "conic-gradient(from -90deg, #00a99d 0deg 45deg, #7edfd5 45deg 90deg, #fff0c7 90deg 135deg, #ffb84d 135deg 180deg, #00a99d 180deg 225deg, #7edfd5 225deg 270deg, #fff0c7 270deg 315deg, #ffb84d 315deg 360deg)",
              }}
            >
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_24%,rgba(255,255,255,0.28),transparent_30%),repeating-conic-gradient(from_-90deg,transparent_0deg,transparent_44.15deg,rgba(255,255,255,0.52)_44.5deg,rgba(255,255,255,0.52)_45deg)]" />
              <div className="absolute inset-[16px] rounded-full border border-white/50" />
              <div className="absolute inset-0">
                {wheelKnobs.map((angle) => (
                  <span
                    key={angle}
                    className="absolute left-1/2 top-1/2 h-6 w-6 rounded-full bg-white shadow-[0_4px_8px_rgba(119,21,64,0.14)]"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-160px)`,
                    }}
                  />
                ))}
              </div>
              <div className="absolute inset-0">
                {wheelSegments.map((segment) => (
                  <div
                    key={`${segment.centerAngle}-${segment.result}`}
                    className={`absolute left-1/2 top-1/2 flex w-[82px] origin-center -translate-x-1/2 -translate-y-1/2 justify-center text-center text-[10px] font-black uppercase leading-tight tracking-[0.08em] drop-shadow-[0_1px_0_rgba(255,255,255,0.45)] sm:w-24 sm:text-[12px] ${
                      segment.result === "win"
                        ? segment.centerAngle === 22.5 || segment.centerAngle === 202.5
                          ? "text-[#00877e]"
                          : "text-white"
                        : "text-[#173b3b]"
                    }`}
                    style={{
                      transform: `translate(-50%, -50%) rotate(${segment.centerAngle}deg) translateY(-102px) rotate(-90deg)`,
                    }}
                  >
                    {segment.result === "win" ? segment.label : segment.shortLabel}
                  </div>
                ))}
              </div>
              <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[7px] border-white bg-[#d8f3ef] text-[#00877e] shadow-[0_10px_22px_rgba(0,105,112,0.22)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1fffc] text-[#00877e]">
                  <Gift className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center px-7 py-9 md:px-10">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-[#00877e]">{t("wheel.eyebrow")}</p>
            <h2 className="text-3xl font-black tracking-tight text-black">{t("wheel.title")}</h2>
            <p className="mt-4 text-sm leading-6 text-neutral-600">{t("wheel.description")}</p>

            <div className="mt-6 border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-600">
              {t("wheel.once")}
            </div>

            {result && (
              <div className={`mt-6 border px-4 py-4 ${won ? "border-cyan-200 bg-cyan-50" : "border-neutral-200 bg-neutral-50"}`}>
                <p className={`text-base font-black ${won ? "text-[#00877e]" : "text-neutral-900"}`}>
                  {won ? t("wheel.winTitle") : t("wheel.loseTitle")}
                </p>
                <p className="mt-2 text-sm text-neutral-600">{won ? t("wheel.winText") : t("wheel.loseText")}</p>
                {won && (
                  <p className="mt-3 inline-flex items-center bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-black">
                    {t("cart.wheelCode")} : {REWARD_CODE}
                  </p>
                )}
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {!result && (
                <button
                  type="button"
                  onClick={spin}
                  disabled={spinning}
                  className="flex min-h-12 flex-1 items-center justify-center bg-[#00877e] px-6 text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-[#00736b] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {spinning ? t("wheel.spinning") : t("wheel.spin")}
                </button>
              )}

              {won && (
                <Link
                  to="/panier"
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 flex-1 items-center justify-center bg-[#00877e] px-6 text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-[#00736b]"
                >
                  {t("wheel.useReward")}
                </Link>
              )}

              {lost && (
                <button
                  type="button"
                  onClick={close}
                  className="flex min-h-12 flex-1 items-center justify-center border border-[#00877e] px-6 text-sm font-black uppercase tracking-wide text-[#00877e] transition-colors hover:bg-teal-50"
                >
                  {t("wheel.continue")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LuckyWheelPopup;
