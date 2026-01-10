

export async function warmupRoutes() {
  const criticalRoutes = [
    // Public routes
    '/',
    '/search',
    '/booking/demo-trip-id', // template, will be cached for any booking ID
    '/payment/vnpay-return',

    // Auth routes
    '/auth/login',
    '/auth/register',
    '/auth/owner-register',
    '/auth/profile',

    // User routes
    '/my-tickets',

    // Owner routes
    '/owner/dashboard',
    '/owner/buses',
    '/owner/drivers',
    '/owner/companies',
    '/owner/routes',
    '/owner/trip-templates',
    '/owner/trips',

    // Admin routes
    '/admin/dashboard',
    '/admin/users',
    '/admin/companies',
    '/admin/stations',
    '/admin/settings',

    '/driver',
    '/driver/trips',

    // Pending approval
    '/pending-approval',
  ];

  console.log(`🔥 Starting route warm-up for ${criticalRoutes.length} routes...`);
  
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  let success = 0;
  let failed = 0;

  for (const route of criticalRoutes) {
    try {
      const url = `${base}${route}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Route-Warmer/1.0',
        },
      });

      if (res.ok) {
        success++;
        console.log(`  ✓ ${route} (${res.status})`);
      } else {
        failed++;
        console.log(`  ⚠ ${route} (${res.status})`);
      }
    } catch (err) {
      failed++;
      if (err instanceof Error) {
        console.error(`  ✗ ${route} - ${err.message}`);
      } else {
        console.error(`  ✗ ${route}`, err);
      }
    }

    // Small delay between requests to avoid overwhelming the server
    await new Promise((res) => setTimeout(res, 100));
  }

  console.log(`✅ Route warm-up complete: ${success} success, ${failed} failed`);
}
