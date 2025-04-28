import { prerender } from "react-dom/static";


export default {
  // Config options...
  async prerender() {
    return {
      routes: [
        "/om-oss",
      ],
    };
  },
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
};
