import { Providers } from "@/components/layout/Providers";
import { Suspense } from "react";
import { Header, HeaderView } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { StoreProvider } from "@/components/store/StoreProvider";
import { getStoreProducts } from "@/lib/server/products";
import { getStoreSettings } from "@/lib/server/settings";

/** The storefront: products, prices and delivery fees come from the dashboard (cached, refreshed on every save). */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [products, { pricing, deliveryFees, store }] = await Promise.all([getStoreProducts(), getStoreSettings()]);
  return (
    <StoreProvider products={products} pricing={pricing} deliveryFees={deliveryFees} store={store}>
      <Providers>
        <Suspense fallback={<HeaderView pathname="" />}>
          <Header />
        </Suspense>
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer instagram={store.instagram} instagramHandle={store.instagramHandle} />
        <CartDrawer />
      </Providers>
    </StoreProvider>
  );
}
