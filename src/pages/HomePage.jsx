
import { useEffect, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import {
  ArrowRight,
  Leaf,
  Sparkles,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import StateCard from '../components/StateCard';
import { getApprovedReviews, getCategories, getProducts } from '../services/api';

const CLOUDINARY_HERO_URL =
  'https://res.cloudinary.com/jwoloh7i/image/upload/v1792060180/hero.jpg';

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');

  useEffect(() => {
    let isMounted = true;

    Promise.all([getProducts({ sort: 'popularity' }), getCategories()])
      .then(([productsResponse, categoriesResponse]) => {
        if (!isMounted) return;

        setProducts((productsResponse.data || []).filter((product) => product.featured === true).slice(0, 4));
        setCategories(categoriesResponse.data || []);
        setProductsError('');
      })
      .catch(() => {
        if (!isMounted) return;

        setProducts([]);
        setProductsError('Could not load featured products right now.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getApprovedReviews()
      .then((response) => {
        if (!isMounted) return;

        setReviews(response.data || []);
        setReviewsError('');
      })
      .catch((fetchError) => {
        if (!isMounted) return;

        setReviews([]);
        setReviewsError(
          fetchError.message || 'Could not load customer reviews'
        );
      })
      .finally(() => {
        if (isMounted) setReviewsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="grid items-center gap-10 rounded-[2rem] border border-stone-200 bg-white/80 p-8 shadow-sm lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-700">
            ReforgedX
          </p>

          <h1 className="mt-4 text-4xl font-semibold leading-tight text-stone-900 sm:text-5xl">
            We See Waste As A Resource
          </h1>

          <p className="mt-6 max-w-xl text-lg text-stone-600">
            We convert plastic waste into premium 3D printing filament and
            customized objects that feel elegant, durable, and responsibly
            made.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3 font-medium text-white"
            >
              Explore products
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/custom-order"
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-6 py-3 font-medium text-stone-700"
            >
              Request a custom order
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-6 text-sm text-stone-600">
            <span className="flex items-center gap-2">
              <Leaf size={16} className="text-amber-700" />
              Sustainable production
            </span>

            <span className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-amber-700" />
              Premium finish
            </span>
          </div>
        </Motion.div>

        {/* Cloudinary Hero Image */}
        <Motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <img
            src={CLOUDINARY_HERO_URL}
            alt="ReforgedX manufacturing workspace"
            className="h-[480px] w-full rounded-[2rem] bg-stone-100 object-cover"
            loading="eager"
            fetchPriority="high"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        </Motion.div>
      </section>

      {/* Featured Products */}
      <section className="space-y-8">
        <SectionHeading
          eyebrow="Featured Collections"
          title="Premium products shaped from responsible materials"
          description="Browse our best-selling lamps, lithophanes, decor, and custom pieces."
          center
        />

        {loading ? (
          <p className="text-center text-stone-600">Loading products...</p>
        ) : productsError ? (
          <StateCard
            tone="error"
            title="Unable to load featured products"
            description={productsError}
          />
        ) : products.length === 0 ? (
          <StateCard
            title="No featured products yet"
            description="Featured products will appear here when the admin selects them."
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id || product._id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="space-y-8">
        <SectionHeading
          eyebrow="Explore by Category"
          title="Choose the right category for your next piece"
          description="Every category opens into a more focused product experience with banners, FAQs, and a curated grid."
          center
        />

        {categories.length === 0 ? (
          <StateCard
            title="No categories available"
            description="Product categories will appear here when they become available."
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard
                key={category.id || category._id}
                category={category}
              />
            ))}
          </div>
        )}
      </section>

      {/* About ReforgedX */}
      <section className="grid items-center gap-8 rounded-[2rem] border border-stone-200 bg-stone-50 p-8 lg:grid-cols-[1fr_0.9fr] lg:p-12">
        <div>
          <SectionHeading
            eyebrow="About ReforgedX"
            title="Crafted with intention, built for everyday life"
            description="We believe the future of manufacturing can be both beautiful and circular."
          />

          <p className="mt-6 text-lg text-stone-600">
            Our mission is to transform plastic waste into useful products
            through sustainable manufacturing, thoughtful design, and
            high-quality 3D printing.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { title: 'PLA', subtitle: 'Lightweight and durable' },
              { title: 'ABS', subtitle: 'High heat resistance' },
              { title: 'Custom', subtitle: 'Made to your brief' },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <p className="text-sm font-semibold text-stone-900">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  {item.subtitle}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-stone-900 p-8 text-white">
          <div className="flex items-center gap-3">
            <Sparkles size={20} className="text-amber-400" />
            <p className="text-sm uppercase tracking-[0.3em] text-stone-300">
              Our process
            </p>
          </div>

          <div className="mt-8 space-y-5">
            {[
              'Collect and sort plastic waste',
              'Extrude premium filament',
              'Print and finish custom objects',
              'Deliver to your doorstep',
            ].map((step, index) => (
              <div key={step} className="flex gap-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                  0{index + 1}
                </div>

                <div>
                  <p className="font-medium">{step}</p>
                  <p className="text-sm text-stone-300">
                    A simple, traceable workflow that respects material value.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Reviews */}
      <section className="space-y-8">
        <SectionHeading
          eyebrow="What customers say"
          title="Trusted by makers, homes, and growing businesses"
          description="Every review reflects the care we bring to materials, finish, and service."
          center
        />

        {reviewsLoading && (
          <p className="text-center text-stone-600">
            Loading customer reviews...
          </p>
        )}

        {reviewsError && (
          <StateCard
            tone="error"
            title="Unable to load customer reviews"
            description={reviewsError}
          />
        )}

        {!reviewsLoading && !reviewsError && reviews.length === 0 && (
          <StateCard
            title="No customer reviews yet"
            description="Approved customer reviews will appear here soon."
          />
        )}

        {!reviewsLoading && !reviewsError && reviews.length > 0 && (
          <div className="grid gap-6 md:grid-cols-3">
            {reviews.map((review) => (
              <div
                key={review.id || review._id}
                className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-sm"
              >
                <div className="flex gap-1 text-amber-500">
                  {Array.from({
                    length: Math.max(
                      0,
                      Math.min(5, Number(review.rating) || 0)
                    ),
                  }).map((_, index) => (
                    <Star key={index} size={16} fill="currentColor" />
                  ))}
                </div>

                <p className="mt-4 text-stone-600">
                  “
                  {review.description ||
                    review.title ||
                    'A wonderful ReforgedX experience.'}
                  ”
                </p>

                <p className="mt-5 font-semibold text-stone-900">
                  {review.customerName || 'ReforgedX customer'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Contact CTA */}
      <section className="rounded-[2rem] border border-stone-200 bg-stone-900 p-8 text-white lg:p-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-stone-400">
              Contact
            </p>

            <h2 className="mt-2 text-3xl font-semibold">
              Let’s build something meaningful together
            </h2>

            <p className="mt-4 max-w-2xl text-stone-300">
              Whether you need a product catalog, a custom print, or a long-term
              collaboration, the team at ReforgedX is ready to help.
            </p>
          </div>

          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-stone-900"
          >
            Contact us
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
