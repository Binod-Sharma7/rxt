import { useEffect, useState } from 'react';
import SectionHeading from '../components/SectionHeading';
import StateCard from '../components/StateCard';
import { getFaqs } from '../services/api';

const FaqPage = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getFaqs()
      .then((response) => {
        setFaqs(response.data || []);
        setError('');
      })
      .catch((fetchError) => {
        setFaqs([]);
        setError(fetchError.message || 'Could not load FAQs');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10">
      <SectionHeading eyebrow="FAQs" title="Frequently asked questions" description="Everything you need to know about ordering, shipping, and our materials." />
      <div className="grid gap-4">
        {loading ? <p className="text-stone-600">Loading FAQs...</p> : null}
        {error ? <StateCard tone="error" title="Unable to load FAQs" description={error} /> : null}
        {!loading && !error && faqs.length === 0 ? <StateCard title="No FAQs available" description="Frequently asked questions will appear here soon." /> : null}
        {!loading && !error && faqs.map((faq) => (
          <details key={faq.question} className="rounded-[1.75rem] border border-stone-200 bg-white p-6">
            <summary className="cursor-pointer text-lg font-semibold text-stone-900">{faq.question}</summary>
            <p className="mt-4 text-stone-600">{faq.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
};

export default FaqPage;
