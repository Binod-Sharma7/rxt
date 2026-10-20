export const seedData = {
  categories: [
    {
      id: 'lamps',
      name: 'Lamps',
      description: 'Clean-lined lighting crafted from recycled PLA and ABS blends.',
      banner: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'lithophanes',
      name: 'Lithophanes',
      description: 'Personalized luminous art pieces made from recycled filament.',
      banner: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'decorative-items',
      name: 'Decorative Items',
      description: 'Minimal decor pieces that transform waste into lasting statement objects.',
      banner: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'custom-products',
      name: 'Custom Products',
      description: 'Bring your own idea, image, or STL file and we will shape it into reality.',
      banner: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  products: [
    {
      id: 'prod-1',
      name: 'Aster Lamp',
      category: 'lamps',
      price: 4200,
      discount: 12,
      colors: ['Sand', 'Walnut', 'Terracotta'],
      dimensions: '24 × 18 × 12 cm',
      stock: 8,
      popularity: 95,
      featured: true,
      images: ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80'],
      description: 'A sculptural bedside lamp made with recycled PLA and warm brass details.',
      reviews: 18
    },
    {
      id: 'prod-2',
      name: 'Monsoon Lithophane',
      category: 'lithophanes',
      price: 3200,
      discount: 8,
      colors: ['Cream', 'Ash', 'Oak'],
      dimensions: '15 × 10 × 0.6 cm',
      stock: 14,
      popularity: 88,
      featured: true,
      images: ['https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=900&q=80'],
      description: 'Softly illuminated memory art with a personalized image and premium finish.',
      reviews: 27
    },
    {
      id: 'prod-3',
      name: 'Terrace Vase',
      category: 'decorative-items',
      price: 2800,
      discount: 10,
      colors: ['Stone', 'Moss', 'Sage'],
      dimensions: '18 × 18 × 28 cm',
      stock: 11,
      popularity: 83,
      featured: false,
      images: ['https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=900&q=80'],
      description: 'An elegant vase shaped from recycled material and a refined matte finish.',
      reviews: 12
    },
    {
      id: 'prod-4',
      name: 'Studio Organizer',
      category: 'custom-products',
      price: 6500,
      discount: 15,
      colors: ['Charcoal', 'Oat', 'Cedar'],
      dimensions: '35 × 20 × 18 cm',
      stock: 5,
      popularity: 90,
      featured: true,
      images: ['https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=900&q=80'],
      description: 'A custom 3D printed organizer built for your exact storage needs.',
      reviews: 9
    }
  ],
  blogs: [
    {
      id: 'blog-1',
      title: 'How recycled plastics become premium filament',
      category: 'Innovation',
      excerpt: 'From collection to extrusion, each step is designed to preserve quality and lower environmental impact.',
      content: 'ReforgedX uses rigorous quality checks and controlled extrusion to turn mixed waste plastics into a reliable, premium filament for makers and businesses.'
    },
    {
      id: 'blog-2',
      title: 'Designing for sustainability without sacrificing beauty',
      category: 'Design',
      excerpt: 'Our products blend elegant form with responsible production methods.',
      content: 'Every design is made to be useful, timeless, and low waste using modular forms and durable materials.'
    }
  ],
  faqs: [
    {
      id: 'faq-1',
      question: 'Do you ship across Nepal?',
      answer: 'Yes. We deliver across Nepal and can support regional pickup for select locations.'
    },
    {
      id: 'faq-2',
      question: 'Can I request a custom print from my own STL file?',
      answer: 'Absolutely. Upload your STL file and we will review scale, material, and finish options before confirming your order.'
    },
    {
      id: 'faq-3',
      question: 'Which materials do you offer?',
      answer: 'We currently offer PLA and ABS, with room to grow into more materials in the future.'
    }
  ],
  customOrders: [],
  orders: []
};
