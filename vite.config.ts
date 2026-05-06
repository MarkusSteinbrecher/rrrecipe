export default {
  base: "/rrrecipe/",
  server: {
    watch: {
      // Research artifacts and tools live outside the SPA build (ADR 0001).
      // Ignore them so saving research files doesn't reload the dev server.
      ignored: ["**/data/**", "**/research/**", "**/tools/**"],
    },
  },
};
