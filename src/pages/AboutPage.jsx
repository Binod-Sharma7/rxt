import SectionHeading from '../components/SectionHeading';
import { ArrowUpRight } from 'lucide-react';
import { useSiteAssets } from '../context/SiteAssetsContext';

const AboutPage = () => {
  const { assets } = useSiteAssets();

const teamMembers = [
  {
    name: 'Rupesh Malla',
    role: 'Founder & CEO',
    desc: 'Designs refined 3D printed objects and packaging. Guides product strategy and sustainability vision.',
    photo: assets.teamRupesh?.url || '',
  },
  {
    name: 'Ashika Kunwar',
    role: 'Co-founder',
    desc: 'Manages production, sourcing, and custom requests.',
    photo: '',
  },
  {
    name: 'Binod Sharma',
    role: 'Co-founder, Growth lead & Technical head',
    desc: 'Oversees technical development and growth initiatives.',
    photo: assets.teamBinod?.url || '',
  },
];

  return (
    <div className="space-y-12">
      <SectionHeading
        eyebrow="About"
        title="From Plastic Waste to Possibilities"
        description="We turn plastic waste into premium filaments and beautiful 3D printed products for modern homes and businesses."
      />

      <section className="grid gap-8 rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <p className="text-lg text-stone-600">
            ReforgedX is based in Pokhara, Nepal. We combine local material
            recovery with contemporary 3D printing to create products that feel
            premium and intentional.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                label: 'Mission',
                value: 'Convert waste into valuable everyday products.',
              },
              {
                label: 'Vision',
                value:
                  'A circular design studio powered by ethical manufacturing.',
              },
              {
                label: 'Materials',
                value: 'PLA, ABS, and expanding responsibly.',
              },
              {
                label: 'Team',
                value:
                  'Designers, engineers, and sustainability advocates.',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-stone-200 bg-stone-50 p-5"
              >
                <p className="text-sm uppercase tracking-[0.25em] text-stone-500">
                  {item.label}
                </p>
                <p className="mt-3 text-base text-stone-700">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-stone-50 p-8">
          <h2 className="text-2xl font-semibold text-stone-900">
            Meet our team
          </h2>

          <div className="mt-6 grid gap-4">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="flex items-start gap-4 rounded-3xl border border-stone-200 bg-white p-5"
              >
                {member.photo ? (
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="h-12 w-12 shrink-0 rounded-full border border-stone-200 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-sm font-semibold text-stone-600">
                    {member.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900">
                    {member.name}
                  </p>

                  <p className="text-sm uppercase tracking-[0.25em] text-amber-700">
                    {member.role}
                  </p>

                  <p className="mt-2 text-sm text-stone-600">
                    {member.desc}
                  </p>

                  {member.website && (
                    <a
                      href={member.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-amber-700 transition-colors hover:text-amber-900"
                    >
                      Visit Personal Website
                      <ArrowUpRight size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;