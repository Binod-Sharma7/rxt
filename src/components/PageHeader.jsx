const PageHeader = ({ title, description, eyebrow }) => (
  <section className="rounded-[2rem] border border-stone-200 bg-stone-50/80 px-8 py-10 shadow-sm backdrop-blur">
    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">{eyebrow}</p>
    <h1 className="mt-3 text-3xl font-semibold text-stone-900 sm:text-4xl">{title}</h1>
    <p className="mt-4 max-w-2xl text-lg text-stone-600">{description}</p>
  </section>
);

export default PageHeader;
