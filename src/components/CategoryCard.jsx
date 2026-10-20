import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CategoryCard = ({ category }) => (
  <Link to={`/products?category=${category.id}`} className="group overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
    <img src={category.banner} alt={category.name} className="h-40 w-full object-cover" />
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-stone-900">{category.name}</h3>
        <ArrowRight className="text-stone-500 transition group-hover:translate-x-1" size={18} />
      </div>
      <p className="mt-3 text-sm text-stone-600">{category.description}</p>
    </div>
  </Link>
);

export default CategoryCard;
