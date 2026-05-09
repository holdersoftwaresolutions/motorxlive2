import Head from "next/head";
import { BRAND } from "../lib/brand";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        style={{
          background: BRAND.background,
          color: BRAND.text,
          minHeight: "100vh",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <Component {...pageProps} />
      </div>
    </>
  );
}