"use client";

export default function BoostBadge({ boost, service }) {
  if (!boost || !boost.is_active) return null;

  const getBadgeConfig = (serviceType) => {
    const configs = {
      urgent_sticker: {
        icon: "🔥",
        text: "Срочно",
        className: "bg-gradient-to-r from-red-500 to-orange-500 text-white animate-pulse",
      },
      boost_1d: {
        icon: "⬆️",
        text: "В топе",
        className: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white",
      },
      boost_3d: {
        icon: "🚀",
        text: "В топе",
        className: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
      },
      pin_7d: {
        icon: "📌",
        text: "Закреплено",
        className: "bg-gradient-to-r from-yellow-500 to-amber-500 text-white",
      },
      combo_7d: {
        icon: "⭐️",
        text: "Премиум",
        className: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white animate-pulse",
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
