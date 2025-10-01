// This is a Server Component by default
// export default function HomePage() {
//   return (
//     <main>
//       <h1>Welcome to the Next.js App!</h1>
//       <p>This is your home page.</p>
//     </main>
//   );
// }

"use client";

import HomeDashboard from "./home/HomeDashboard";

export default function HomePage() {
  return <HomeDashboard />;
}

