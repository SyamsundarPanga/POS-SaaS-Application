import React from 'react';

const Features: React.FC = () => {
  return (
    <section id="features" className="py-12 pt-6 pb-6 bg-white">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-black mb-4">
            Powerful <span className="text-emerald-500">Features</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Everything you need to run your retail business efficiently, all in one place.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              title: 'Multi-Tenancy',
              icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
              desc: 'Serve unlimited retail businesses from a single codebase while maintaining complete data isolation.',
              image: 'url(https://www.cisco.com/content/dam/cisco-cdc/site/images/legacy/assets/swa/img/anchor-info/what-is-multitenant-sd-wan-628x353.jpg)',
            },
            {
              title: 'Payment Processing',
              icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
              desc: 'Accept all major payment methods with secure, PCI-compliant processing through Stripe and Razorpay.',
              image: 'url(https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ5ehCwzTZKdHsmsN4fL2Wjy_ceT9IbKAt0jg&s)',
            },
            {
              title: 'Inventory Management',
              icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
              desc: 'Real-time inventory tracking across all locations with low-stock alerts and automated reorder suggestions.',
              image: 'url(https://www.ogdenfulfilment.co.uk/wp-content/uploads/2023/11/iStock-1484852942.jpg)',
            },
            {
              title: 'Analytics Dashboard',
              icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
              desc: 'Get insights into sales trends, customer behavior, and product performance with comprehensive business intelligence.',
              image: 'url(https://www.cyfe.com/wp-content/uploads/2020/04/GA-dash-v2.jpg)',
            },
            {
              title: 'Customer Management',
              icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
              desc: 'Build customer profiles, track purchase history, and implement loyalty programs with points and tier-based rewards.',
              image: 'url(https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlayr6adq0SBVj6YYvaRx1unhT9534im7blw&s)',
            },
            {
              title: 'Subscription Billing',
              icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
              desc: 'Tiered subscription plans with usage limits, automated billing, and plan enforcement for scalable business growth.',
              image: 'url(https://www.zipitwireless.com/hubfs/Images/Pillar%20Pages/Subscription%20Billing%20for%20OEMs/Subscription%20Billing%20for%20IoT%20Devices.png)',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="bg-white p-8 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 bg-cover bg-center relative"
              style={{ backgroundImage: feature.image }}
            >
              <div className="relative z-10 flex items-center mb-6">
                <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mr-4 transform hover:scale-110 transition-transform duration-300">
                  <svg
                    className="w-6 h-6 text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">{feature.title}</h3>
              </div>
              <p className="text-white relative z-10">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
