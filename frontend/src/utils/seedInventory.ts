/**
 * Utility script to seed sample inventory data
 * Run this in browser console when logged in to add test data
 */

import api from '../services/api';

export const seedSampleInventory = async () => {
  console.log('🌱 Starting inventory seed...');

  try {
    // First, get existing products
    const productsResponse = await api.get('/products?page=0&size=100');
    const products = productsResponse.data.content || productsResponse.data;

    if (!products || products.length === 0) {
      console.error('❌ No products found. Please add products first!');
      return;
    }

    console.log(`✅ Found ${products.length} products`);

    // Add inventory for each product
    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        const randomQuantity = Math.floor(Math.random() * 100) + 20; // 20-120 units
        const response = await api.post('/inventory/adjust', {
          productId: product.id,
          branchId: null, // All branches
          quantity: randomQuantity,
          movementType: 'INITIAL_STOCK',
          notes: 'Seeded inventory data',
        });

        console.log(`✅ Added ${randomQuantity} units for ${product.name}`);
        successCount++;
      } catch (error: any) {
        console.error(`❌ Failed to add inventory for ${product.name}:`, error.message);
        errorCount++;
      }

      // Small delay to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('\n🎉 Inventory seeding complete!');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('\n🔄 Refreshing page...');

    // Refresh the page to see new data
    setTimeout(() => window.location.reload(), 1000);
  } catch (error: any) {
    console.error('❌ Seed failed:', error.message);
  }
};

// Make it available globally for easy console access
if (typeof window !== 'undefined') {
  (window as any).seedInventory = seedSampleInventory;
}

export default seedSampleInventory;
