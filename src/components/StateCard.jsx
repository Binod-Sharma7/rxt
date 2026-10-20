const StateCard = ({ title, description, action, tone = 'default', icon }) => {
  const toneClasses = {
    default: 'border-stone-300 bg-stone-50 text-stone-700',
    error: 'border-rose-200 bg-rose-50 text-rose-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  };

  return (
    <div className={`rounded-4xl border p-8 text-center ${toneClasses[tone] || toneClasses.default}`}>
      {icon ? <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/80 shadow-sm">{icon}</div> : null}
      <p className="text-lg font-semibold">{title}</p>
      {description ? <p className="mt-2 text-sm">{description}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
};

export default StateCard;
