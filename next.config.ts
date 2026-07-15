import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /book stays on-site for the Mindbody-replacement demo (native schedule).
      // Mindbody Explore remains linked as a fallback from booking UI.
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
};

export default nextConfig;
