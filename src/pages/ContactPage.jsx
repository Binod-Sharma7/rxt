import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { MapPin, Phone, Mail } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';

const EMAILJS_SERVICE_ID = 'service_x4dpdti';
const EMAILJS_TEMPLATE_ID = 'template_pf40izc';
const EMAILJS_PUBLIC_KEY = 'EUfd2WKFqyZwehm50';

const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const ContactPage = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', text: '' });

    if (!form.name || !form.email || !form.subject || !form.message) {
      setFeedback({ type: 'error', text: 'Please fill in all contact form fields.' });
      return;
    }

    setSending(true);
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          name: form.name,
          email: form.email,
          subject: form.subject,
          message: form.message,
          title: form.subject
        },
        { publicKey: EMAILJS_PUBLIC_KEY }
      );

      setFeedback({ type: 'success', text: 'Message sent successfully.' });
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Could not send your message. Please try again later.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-10">
      <SectionHeading eyebrow="Contact" title="Get in touch with ReforgedX" description="Have a question, custom order idea, or wholesale inquiry? We're ready to help." />

      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="space-y-6">
            <div className="flex items-center gap-4 rounded-3xl bg-stone-50 p-5">
              <Phone size={20} className="text-amber-700" />
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-stone-500">Phone</p>
                <p className="mt-2 text-base text-stone-900">+977 9708669389</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-3xl bg-stone-50 p-5">
              <Mail size={20} className="text-amber-700" />
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-stone-500">Email</p>
                <p className="mt-2 text-base text-stone-900">sharmabinod9844976377@gmail.com</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-3xl bg-stone-50 p-5">
              <MapPin size={20} className="text-amber-700" />
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-stone-500">Location</p>
                <p className="mt-2 text-base text-stone-900">Lamachaur, Pokhara, Kaski, Nepal</p>
              </div>
            </div>

            <div className="rounded-3xl bg-stone-50 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-stone-500">Follow us</p>
              <div className="mt-4 flex gap-3">
                <a
                  href="https://www.facebook.com/profile.php?id=61592229504780"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:bg-stone-100"
                >
                  <span className="text-amber-700"><FacebookIcon /></span>
                  Facebook
                </a>
                <a
                  href="https://www.instagram.com/reforgedx/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:bg-stone-100"
                >
                  <span className="text-amber-700"><InstagramIcon /></span>
                  Instagram
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700">Send a message</p>
          <h2 className="mt-4 text-3xl font-semibold text-stone-900">Contact form</h2>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Name</span>
              <input name="name" value={form.name} onChange={handleChange} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Email</span>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Subject</span>
              <input name="subject" value={form.subject} onChange={handleChange} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Message</span>
              <textarea name="message" rows={5} value={form.message} onChange={handleChange} className="w-full rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none" />
            </label>
            {feedback.text ? (
              <p className={`rounded-3xl px-4 py-3 text-sm ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {feedback.text}
              </p>
            ) : null}
            <button type="submit" disabled={sending} className="inline-flex rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {sending ? 'Sending...' : 'Send message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
