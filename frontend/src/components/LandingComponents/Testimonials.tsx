import React from 'react';

const Testimonials: React.FC = () => {
  return (
    <section className="py-12 bg-white pt-6 pb-6">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-6">
          <h2 className="text-4xl md:text-5xl font-black text-black mb-4">
            Trusted by <span className="text-emerald-500">Retailers</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            See what our customers have to say about PayPoint POS.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { initials: 'JD', name: 'John Doe', company: 'Fashion Boutique', text: '"PayPoint transformed our retail operations. The multi-tenant architecture allows us to manage all our stores from a single dashboard, saving us countless hours each week."' },
            { initials: 'SM', name: 'Sarah Miller', company: 'Electronics Store', text: '"The subscription model is perfect for our growing business. We started with the Basic plan and seamlessly upgraded as we opened more locations. The inventory management is a game-changer."' },
            { initials: 'MJ', name: 'Mike Johnson', company: 'Grocery Chain', text: '"We operate 50+ stores, and PayPoint makes managing inventory across all locations effortless. The real-time sync between our POS terminals is incredible. Best investment we\'ve made."' },
          ].map((testimonial, i) => (
            <div key={i} className="bg-emerald-50 p-8 rounded-2xl border border-emerald-100 shadow-md hover:shadow-xl hover:bg-emerald-100 transition-all duration-300 transform hover:-translate-y-2">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold mr-4">
                  {testimonial.initials}
                </div>
                <div>
                  <h4 className="text-black font-bold">{testimonial.name}</h4>
                  <p className="text-gray-600 text-sm">{testimonial.company}</p>
                </div>
              </div>
              <p className="text-gray-700">{testimonial.text}</p>
              <div className="flex mt-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
