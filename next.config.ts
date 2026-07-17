import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Legacy /book → Fitness Hub Reserve (handled in app/(marketing)/book/page.tsx).
      // Mindbody Explore remains linked as fallbackUrl from siteConfig.
      {
        source: "/tour-ma5",
        destination: "/facility",
        permanent: true,
      },
      {
        source: "/contact-us",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/inbody-scan",
        destination: "/services/inbody-scan",
        permanent: true,
      },
      {
        source: "/infrared-suana",
        destination: "/services/infrared-sauna",
        permanent: true,
      },
      {
        source: "/infrared-sauna-benefits",
        destination: "/services/infrared-sauna",
        permanent: true,
      },
      {
        source: "/privacy-policy",
        destination: "/privacy",
        permanent: true,
      },
      {
        source: "/terms-and-conditions",
        destination: "/terms",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
