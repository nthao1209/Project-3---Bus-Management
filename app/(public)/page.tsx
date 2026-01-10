import { Suspense } from 'react';
import HeroSearch from "@/components/HeroSearch";

export default function HomePage() {
  return (
    <main>
      <Suspense fallback={<div>Loading...</div>}>
        <HeroSearch />
      </Suspense>
    </main>
  );
}
