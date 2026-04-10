import withPWA from "@ducanh2912/next-pwa";

const nextConfig = {
  turbopack: {},
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
})(nextConfig);
