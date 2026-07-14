import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/book",
        destination:
          "https://www.mindbodyonline.com/explore/locations/ma5fitness-llc",
        permanent: false,
      },
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
