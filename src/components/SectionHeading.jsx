const SectionHeading = ({ eyebrow, title, description, center = false }) => (
  <div className={`max-w-3xl ${center ? 'mx-auto text-center' : ''}`}>
    {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">{eyebrow}</p> : null}
    <h2 className="mt-2 text-3xl font-semibold text-stone-900 sm:text-4xl">{title}</h2>
    {description ? <p className="mt-4 text-lg text-stone-600">{description}</p> : null}
  </div>
);

export default SectionHeading;
