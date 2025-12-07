"use client";

export default function BoostBadge({ boost, service }) {
  if (!boost || !boost.is_active) return null;

  const getBadgeConfig = (serviceType) => {
    const configs = {
      urgent_sticker: {
        icon: "🔥",
        text: "Срочно",
        className: "bg-[#FF385C] text-white animate-pulse", // Airbnb Red
      },
      boost_1d: {
        icon: "⬆️",
        text: "В топе",
        className: "bg-[#FF385C]/90 text-white", // Slightly lighter/transparent red
      },
      boost_3d: {
        icon: "🚀",
        text: "В топе",
        className: "bg-[#FF385C] text-white",
      },
      pin_7d: {
        icon: "📌",
        text: "Закреплено",
        className: "bg-black text-white", // Distinctive "Pinned" usually implies stability -> Black/Dark
      },
      combo_7d: {
        icon: "⭐️",
        text: "Премиум",
        className: "bg-gradient-to-r from-[#FF385C] to-[#E00B41] text-white animate-pulse", // Red Gradient
      },
    };
    return configs[serviceType] || configs.boost_1d;
  };

  const config = getBadgeConfig(service?.service_type);

  const getTimeRemaining = () => {
    const now = new Date();
    const expires = new Date(boost.expires_at);
    const diff = expires - now;

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}д`;
    if (hours > 0) return `${hours}ч`;
    return "< 1ч";
  };

  const timeRemaining = getTimeRemaining();

  return (
    <div className="flex gap-1 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${config.className}`}
      >
        <span>{config.icon}</span>
        <span>{config.text}</span>
        {timeRemaining && (
          <span className="opacity-80 text-[10px]">• {timeRemaining}</span>
        )}
      </span>
    </div>
  );
}
